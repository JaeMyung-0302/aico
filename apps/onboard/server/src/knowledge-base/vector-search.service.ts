import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GeminiService } from '../gemini/gemini.service'

interface SearchResult {
  id: string
  content: string
  documentId: string
  similarity: number
  metadata: Record<string, unknown>
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  similaritySearch = async (
    query: string,
    tenantId: string,
    limit = 5,
  ): Promise<SearchResult[]> => {
    const queryEmbedding = await this.geminiService.generateEmbedding(query)
    const embeddingStr = `[${queryEmbedding.join(',')}]`

    const results = await this.prisma.$queryRawUnsafe<SearchResult[]>(
      `SELECT
        dc.id,
        dc.content,
        dc."documentId",
        dc.metadata,
        1 - (dc.embedding <=> $1::vector) as similarity
      FROM document_chunks dc
      JOIN documents d ON d.id = dc."documentId"
      WHERE d."tenantId" = $2
        AND dc.embedding IS NOT NULL
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $3`,
      embeddingStr,
      tenantId,
      limit,
    )

    return results
  }

  storeEmbedding = async (chunkId: string, embedding: number[]): Promise<void> => {
    const embeddingStr = `[${embedding.join(',')}]`

    await this.prisma.$executeRawUnsafe(
      `UPDATE document_chunks SET embedding = $1::vector WHERE id = $2`,
      embeddingStr,
      chunkId,
    )
  }
}
