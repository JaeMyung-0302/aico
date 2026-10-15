import type { MediaBucket } from '../generated/prisma'

// R2(S3 호환) 연동은 이 인터페이스 뒤에 둔다 → 테스트는 메모리 구현으로 바꿔 네트워크를 타지 않는다
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE')

export type StoredObject = { bucket: MediaBucket; key: string }

export type ObjectStorage = {
  // 업로드용 presigned PUT (Content-Type·Content-Length를 서명에 고정)
  presignPut: (
    input: StoredObject & { contentType: string; contentLength: number; expiresIn: number },
  ) => Promise<string>
  // 열람용 presigned GET (증명서: 60초)
  presignGet: (input: StoredObject & { expiresIn: number }) => Promise<string>
  // 없으면 null
  getObject: (input: StoredObject) => Promise<Buffer | null>
  putObject: (input: StoredObject & { body: Buffer; contentType: string; cacheControl?: string }) => Promise<void>
  deleteObjects: (objects: readonly StoredObject[]) => Promise<void>
}
