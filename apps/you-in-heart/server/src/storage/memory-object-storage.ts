import { Readable } from 'node:stream'
import { Injectable } from '@nestjs/common'
import {
  assertDeletablePrefix,
  type ObjectStorage,
  type PresignPutInput,
  type PutObjectInput,
  type UploadStreamInput,
} from './object-storage'

// presigned URL 모양만 흉내 낸다(만료는 X-Amz-Expires 쿼리로 확인)
const MEMORY_ORIGIN = 'https://storage.test'

// 통합 테스트용 메모리 구현(OBJECT_STORAGE override)
@Injectable()
export class MemoryObjectStorage implements ObjectStorage {
  private objects: ReadonlyMap<string, Buffer> = new Map()

  async putObject({ key, body }: PutObjectInput): Promise<void> {
    this.objects = new Map([...this.objects, [key, body]])
  }

  async getObject(key: string): Promise<Buffer | null> {
    return this.objects.get(key) ?? null
  }

  async head(key: string): Promise<{ size: number } | null> {
    const body = this.objects.get(key)
    return body ? { size: body.length } : null
  }

  async listKeys(prefix: string): Promise<string[]> {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort()
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    const removed = new Set(keys)
    this.objects = new Map([...this.objects].filter(([key]) => !removed.has(key)))
  }

  async deletePrefix(prefix: string): Promise<number> {
    assertDeletablePrefix(prefix)
    const keys = await this.listKeys(prefix)
    await this.deleteObjects(keys)
    return keys.length
  }

  async presignPut({ key, expiresIn }: PresignPutInput): Promise<string> {
    return `${MEMORY_ORIGIN}/${key}?X-Amz-Expires=${expiresIn}&x-id=PutObject`
  }

  async presignGet(key: string, expiresIn: number): Promise<string> {
    return `${MEMORY_ORIGIN}/${key}?X-Amz-Expires=${expiresIn}&x-id=GetObject`
  }

  async getObjectRange(key: string, length: number): Promise<Buffer | null> {
    return this.objects.get(key)?.subarray(0, length) ?? null
  }

  async getObjectStream(key: string): Promise<Readable | null> {
    const body = this.objects.get(key)
    return body ? Readable.from([body]) : null
  }

  async uploadStream({ key, body, contentType }: UploadStreamInput): Promise<void> {
    const chunks = await body.toArray()
    const buffer = Buffer.concat(chunks.filter((chunk): chunk is Buffer => Buffer.isBuffer(chunk)))
    await this.putObject({ key, body: buffer, contentType })
  }

  clear(): void {
    this.objects = new Map()
  }
}
