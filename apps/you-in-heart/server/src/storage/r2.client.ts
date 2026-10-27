import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration'
import { assertDeletablePrefix, type ObjectStorage, type PutObjectInput } from './object-storage'

type R2Config = AppConfig['r2']

// S3 ListObjectsV2·DeleteObjects 1회 최대 키 수
const PAGE_SIZE = 1000

const isNotFound = (error: unknown): boolean =>
  error instanceof NotFound ||
  error instanceof NoSuchKey ||
  (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)

// 운영: Cloudflare R2 계정 엔드포인트. 로컬: R2_ENDPOINT(SeaweedFS 9440)로 바꾸고 path-style로 접속
export const s3ClientOptions = (r2: R2Config) => {
  const hasCustomEndpoint = r2.endpoint.length > 0
  return {
    region: 'auto',
    endpoint: hasCustomEndpoint ? r2.endpoint : `https://${r2.accountId || 'unconfigured'}.r2.cloudflarestorage.com`,
    forcePathStyle: hasCustomEndpoint,
    // SDK 기본(WHEN_SUPPORTED)은 presigned PUT에 빈 본문의 CRC32를 서명해 넣는다 → R2가 실제 업로드를 거부한다
    requestChecksumCalculation: 'WHEN_REQUIRED' as const,
    responseChecksumValidation: 'WHEN_REQUIRED' as const,
    credentials: {
      accessKeyId: r2.accessKeyId || 'unconfigured',
      secretAccessKey: r2.secretAccessKey || 'unconfigured',
    },
  }
}

// Cloudflare R2 private 버킷 하나. S3 호환 API를 그대로 쓴다
@Injectable()
export class R2ObjectStorage implements ObjectStorage {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: ConfigService) {
    const r2 = config.get<R2Config>('r2')
    if (!r2) throw new Error('r2 설정이 없습니다')
    this.client = new S3Client(s3ClientOptions(r2))
    this.bucket = r2.privateBucket
  }

  async putObject({ key, body, contentType }: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    )
  }

  async getObject(key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      const bytes = await response.Body?.transformToByteArray()
      return Buffer.from(bytes ?? [])
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async head(key: string): Promise<{ size: number } | null> {
    try {
      const response = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return { size: response.ContentLength ?? 0 }
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async listKeys(prefix: string): Promise<string[]> {
    const collect = async (token: string | undefined, acc: readonly string[]): Promise<string[]> => {
      const page = await this.listPage(prefix, token)
      const keys = [...acc, ...page.keys]
      return page.nextToken ? collect(page.nextToken, keys) : keys
    }
    return collect(undefined, [])
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return
    const batches = Array.from({ length: Math.ceil(keys.length / PAGE_SIZE) }, (_, index) =>
      keys.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE),
    )
    await Promise.all(
      batches.map((batch) =>
        this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          }),
        ),
      ),
    )
  }

  // 첫 페이지(최대 1,000개)를 지우고 다시 목록을 본다 → 삭제 중 목록이 바뀌어도 빈 페이지가 나올 때까지 반복
  async deletePrefix(prefix: string): Promise<number> {
    assertDeletablePrefix(prefix)
    const loop = async (deleted: number): Promise<number> => {
      const { keys } = await this.listPage(prefix, undefined)
      if (keys.length === 0) return deleted
      await this.deleteObjects(keys)
      return loop(deleted + keys.length)
    }
    return loop(0)
  }

  private async listPage(prefix: string, token: string | undefined): Promise<{ keys: string[]; nextToken?: string }> {
    const response = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, MaxKeys: PAGE_SIZE, ContinuationToken: token }),
    )
    const keys = (response.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : []))
    return { keys, nextToken: response.IsTruncated ? response.NextContinuationToken : undefined }
  }
}
