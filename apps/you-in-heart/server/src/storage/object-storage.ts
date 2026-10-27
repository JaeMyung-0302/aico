import type { Readable } from 'node:stream'

// R2(S3 호환) 연동은 이 인터페이스 뒤에 둔다 → 통합 테스트는 메모리 구현으로 바꿔 네트워크를 타지 않는다
// 버킷은 private 하나(architecture §11). 앱은 presigned URL로만 객체에 닿는다
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE')

export type PutObjectInput = { key: string; body: Buffer; contentType: string }

// contentLength가 있으면 서명에 포함돼 그 크기가 아니면 저장소가 PUT을 거부한다
// 크기를 모르는 스트림(내보내기 zip) 업로드. 구현은 멀티파트로 나눠 메모리를 파트 크기×동시성으로 묶는다
export type UploadStreamInput = { key: string; body: Readable; contentType: string }

export type PresignPutInput = { key: string; contentType: string; contentLength?: number; expiresIn: number }

export type ObjectStorage = {
  putObject: (input: PutObjectInput) => Promise<void>
  // 본문 전체. 없으면 null(원장처럼 작은 객체만 읽는다)
  getObject: (key: string) => Promise<Buffer | null>
  // 없으면 null
  head: (key: string) => Promise<{ size: number } | null>
  // 접두사 아래 전체 키(페이지를 끝까지 따라간다)
  listKeys: (prefix: string) => Promise<string[]>
  deleteObjects: (keys: readonly string[]) => Promise<void>
  // 접두사 아래를 1,000개씩 지운다. 지운 개수. 빈 접두사·'/'로 끝나지 않는 접두사는 거부
  deletePrefix: (prefix: string) => Promise<number>
  presignPut: (input: PresignPutInput) => Promise<string>
  presignGet: (key: string, expiresIn: number) => Promise<string>
  // 통째로 읽되 maxBytes를 넘으면 ObjectTooLargeError(Range로 max+1바이트까지만 받는다 → HEAD 뒤 바꿔치기해도 메모리 상한 유지). 없으면 null
  getObjectBounded: (key: string, maxBytes: number) => Promise<Buffer | null>
  // 앞 length바이트(Range 요청, 매직 넘버 검사용). 없으면 null
  getObjectRange: (key: string, length: number) => Promise<Buffer | null>
  // 큰 객체(원본 사진)를 버퍼에 올리지 않고 읽는다. 없으면 null
  getObjectStream: (key: string) => Promise<Readable | null>
  uploadStream: (input: UploadStreamInput) => Promise<void>
}

export class ObjectTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`객체가 ${maxBytes}바이트를 넘습니다`)
    this.name = 'ObjectTooLargeError'
  }
}

export const assertDeletablePrefix = (prefix: string): void => {
  if (prefix.length < 2 || !prefix.endsWith('/')) throw new Error('삭제 접두사는 비어 있지 않고 /로 끝나야 합니다')
}
