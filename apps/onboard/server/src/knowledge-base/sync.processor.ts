import { Injectable, Logger } from '@nestjs/common'
import { KnowledgeBaseService } from './knowledge-base.service'

export interface SyncJob {
  integrationId: string
  tenantId: string
}

@Injectable()
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name)
  private readonly queue: SyncJob[] = []
  private processing = false

  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  addJob = (job: SyncJob) => {
    this.queue.push(job)
    this.logger.log(`Sync job queued: integration=${job.integrationId}`)

    if (!this.processing) {
      this.processQueue()
    }
  }

  private processQueue = async () => {
    this.processing = true

    while (this.queue.length > 0) {
      const job = this.queue.shift()
      if (!job) break

      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        try {
          await this.knowledgeBaseService.syncDocuments(job.integrationId, job.tenantId)
          this.logger.log(`Sync completed: integration=${job.integrationId}`)
          break
        } catch (error) {
          attempts++
          this.logger.error(
            `Sync failed (attempt ${attempts}/${maxAttempts}): integration=${job.integrationId}`,
            error,
          )
          if (attempts >= maxAttempts) {
            this.logger.error(`Sync permanently failed: integration=${job.integrationId}`)
          }
        }
      }
    }

    this.processing = false
  }
}
