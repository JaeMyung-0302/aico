import {
  DeleteObjectsCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration'
import type { MediaBucket } from '../generated/prisma'
import type { ObjectStorage, StoredObject } from './object-storage'

type R2Config = AppConfig['r2']

// S3 DeleteObjects 1회 최대 키 수
const DELETE_BATCH = 1000

const isNotFound = (error: unknown): boolean =>
  error instanceof NoSuchKey || (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)

// 운영: Cloudflare R2 계정 엔드포인트. 로컬 개발: R2_ENDPOINT(MinIO 등 S3 호환)로 바꾸고 path-style로 접속
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

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

// D7: Cloudflare R2 버킷 2개(public: 커스텀 도메인 / private: presigned 전용). S3 호환 API를 그대로 쓴다
@Injectable()
export class R2ObjectStorage implements ObjectStorage {
  private readonly client: S3Client
  private readonly buckets: Record<MediaBucket, string>

  constructor(config: ConfigService) {
    const r2 = config.get<R2Config>('r2')
    if (!r2) throw new Error('r2 설정이 없습니다')
    this.client = new S3Client(s3ClientOptions(r2))
    this.buckets = { PUBLIC: r2.publicBucket, PRIVATE: r2.privateBucket }
  }

  // host만 서명한다: Android(React Native)는 Content-Type·길이를 바꿔(chunked) 보내 서명이 깨진다.
  // 업로드된 원본은 complete에서 크기 검사 + 디코딩·재인코딩하므로 헤더를 서명으로 묶을 필요가 없다
  presignPut({ bucket, key, expiresIn }: StoredObject & { expiresIn: number }): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.buckets[bucket], Key: key })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  presignGet({ bucket, key, expiresIn }: StoredObject & { expiresIn: number }): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }), { expiresIn })
  }

  async getObject({ bucket, key }: StoredObject): Promise<Buffer | null> {
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }))
      if (!response.Body) return null
      return Buffer.from(await response.Body.transformToByteArray())
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async putObject({
    bucket,
    key,
    body,
    contentType,
    cacheControl,
  }: StoredObject & { body: Buffer; contentType: string; cacheControl?: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.buckets[bucket],
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    )
  }

  async deleteObjects(objects: readonly StoredObject[]): Promise<void> {
    const byBucket = (['PUBLIC', 'PRIVATE'] as const).map((bucket) => ({
      bucket,
      keys: objects.filter((object) => object.bucket === bucket).map((object) => object.key),
    }))
    await Promise.all(
      byBucket.flatMap(({ bucket, keys }) =>
        chunk(keys, DELETE_BATCH).map((batch) =>
          this.client.send(
            new DeleteObjectsCommand({
              Bucket: this.buckets[bucket],
              Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
            }),
          ),
        ),
      ),
    )
  }
}
