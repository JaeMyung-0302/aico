import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { NotionProvider } from './providers/notion.provider'
import { GitHubProvider } from './providers/github.provider'

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name)
  private readonly encryptionKey: Buffer

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notionProvider: NotionProvider,
    private readonly githubProvider: GitHubProvider,
  ) {
    const key = this.configService.get<string>('encryption.key')
    if (!key && process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production')
    }
    if (!key) {
      this.logger.warn('ENCRYPTION_KEY not set. Using random key (tokens will not survive restarts)')
    }
    this.encryptionKey = key ? Buffer.from(key, 'hex') : randomBytes(32)
  }

  private encrypt = (plaintext: string): string => {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  private decrypt = (ciphertext: string): string => {
    const buf = Buffer.from(ciphertext, 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const encrypted = buf.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  createIntegration = async (
    type: 'notion' | 'github',
    accessToken: string,
    tenantId: string,
    config?: Record<string, unknown>,
  ) => {
    const encryptedToken = this.encrypt(accessToken)
    const integration = await this.prisma.integration.create({
      data: {
        type,
        accessToken: encryptedToken,
        config: (config || {}) as Record<string, string>,
        tenantId,
      },
    })

    return { ...integration, accessToken: '***' }
  }

  listIntegrations = async (tenantId: string) => {
    const integrations = await this.prisma.integration.findMany({
      where: { tenantId },
      select: {
        id: true,
        type: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
      },
    })

    return integrations
  }

  deleteIntegration = async (id: string, tenantId: string) => {
    const integration = await this.prisma.integration.findFirst({
      where: { id, tenantId },
    })
    if (!integration) {
      throw new NotFoundException('연동을 찾을 수 없습니다.')
    }

    await this.prisma.integration.delete({ where: { id } })
    return { deleted: true }
  }

  testConnection = async (id: string, tenantId: string) => {
    const integration = await this.prisma.integration.findFirst({
      where: { id, tenantId },
    })
    if (!integration) {
      throw new NotFoundException('연동을 찾을 수 없습니다.')
    }

    const token = this.decrypt(integration.accessToken)

    try {
      if (integration.type === 'notion') {
        await this.notionProvider.testConnection(token)
      } else {
        await this.githubProvider.testConnection(token)
      }
      return { status: 'connected' }
    } catch (error) {
      this.logger.error(`Connection test failed for ${integration.type}`, error)
      return { status: 'failed', message: '연결 테스트에 실패했습니다.' }
    }
  }

  getDecryptedToken = (encryptedToken: string): string => {
    return this.decrypt(encryptedToken)
  }
}
