import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GeminiService } from '../gemini/gemini.service'
import { IntegrationsService } from '../integrations/integrations.service'
import { NotionProvider } from '../integrations/providers/notion.provider'
import { GitHubProvider } from '../integrations/providers/github.provider'
import { VectorSearchService } from './vector-search.service'
import { splitIntoChunks } from './chunking.util'

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly integrationsService: IntegrationsService,
    private readonly notionProvider: NotionProvider,
    private readonly githubProvider: GitHubProvider,
    private readonly vectorSearchService: VectorSearchService,
  ) {}

  syncDocuments = async (integrationId: string, tenantId: string) => {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    })
    if (!integration) {
      throw new NotFoundException('연동을 찾을 수 없습니다.')
    }

    const token = this.integrationsService.getDecryptedToken(integration.accessToken)
    this.logger.log(`Starting sync for ${integration.type} integration ${integrationId}`)

    try {
      if (integration.type === 'notion') {
        await this.syncNotionDocuments(token, integration.id, tenantId)
      } else if (integration.type === 'github') {
        const config = integration.config as Record<string, string>
        await this.syncGitHubDocuments(token, config.owner || '', config.repo || '', integration.id, tenantId)
      }

      this.logger.log(`Sync completed for integration ${integrationId}`)
    } catch (error) {
      this.logger.error(`Sync failed for integration ${integrationId}`, error)
      throw error
    }
  }

  getDocuments = async (tenantId: string) => {
    const documents = await this.prisma.document.findMany({
      where: { tenantId },
      include: { _count: { select: { chunks: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    return documents.map((doc) => ({
      ...doc,
      chunkCount: doc._count.chunks,
      _count: undefined,
    }))
  }

  getSyncStatus = async (tenantId: string) => {
    const [documentCount, chunkCount] = await Promise.all([
      this.prisma.document.count({ where: { tenantId } }),
      this.prisma.documentChunk.count({
        where: { document: { tenantId } },
      }),
    ])

    return { documentCount, chunkCount }
  }

  private syncNotionDocuments = async (
    token: string,
    integrationId: string,
    tenantId: string,
  ) => {
    const pages = await this.notionProvider.fetchPages(token)
    this.logger.log(`Found ${pages.length} Notion pages`)

    for (const page of pages) {
      const content = await this.notionProvider.fetchPageContent(token, page.id)
      if (!content.trim()) continue

      const document = await this.prisma.document.upsert({
        where: { integrationId_externalId: { integrationId, externalId: page.id } },
        update: { title: page.title, content, sourceUrl: page.url, lastSyncedAt: new Date() },
        create: {
          externalId: page.id,
          title: page.title,
          content,
          sourceUrl: page.url,
          tenantId,
          integrationId,
        },
      })

      await this.processDocumentChunks(document.id, content)
    }
  }

  private syncGitHubDocuments = async (
    token: string,
    owner: string,
    repo: string,
    integrationId: string,
    tenantId: string,
  ) => {
    const files = await this.githubProvider.fetchRepoFiles(token, owner, repo)
    this.logger.log(`Found ${files.length} doc files in ${owner}/${repo}`)

    for (const file of files) {
      const content = await this.githubProvider.fetchFileContent(token, owner, repo, file.path)
      if (!content.trim()) continue

      const document = await this.prisma.document.upsert({
        where: { integrationId_externalId: { integrationId, externalId: file.sha } },
        update: { title: file.path, content, sourceUrl: file.url, lastSyncedAt: new Date() },
        create: {
          externalId: file.sha,
          title: file.path,
          content,
          sourceUrl: file.url,
          tenantId,
          integrationId,
        },
      })

      await this.processDocumentChunks(document.id, content)
    }
  }

  private processDocumentChunks = async (documentId: string, content: string) => {
    await this.prisma.documentChunk.deleteMany({ where: { documentId } })

    const chunks = splitIntoChunks(content)
    this.logger.log(`Processing ${chunks.length} chunks for document ${documentId}`)

    for (const chunkContent of chunks) {
      const chunk = await this.prisma.documentChunk.create({
        data: { content: chunkContent, documentId },
      })

      try {
        const embedding = await this.geminiService.generateEmbedding(chunkContent)
        await this.vectorSearchService.storeEmbedding(chunk.id, embedding)
      } catch (error) {
        this.logger.warn(`Failed to generate embedding for chunk ${chunk.id}`, error)
      }
    }
  }
}
