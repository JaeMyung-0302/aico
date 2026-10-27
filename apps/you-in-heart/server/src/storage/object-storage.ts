// R2(S3 호환) 연동은 이 인터페이스 뒤에 둔다 → 통합 테스트는 메모리 구현으로 바꿔 네트워크를 타지 않는다
// 버킷은 private 하나(architecture §11). 앱은 presigned URL로만 객체에 닿는다
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE')

export type PutObjectInput = { key: string; body: Buffer; contentType: string }

// contentLength가 있으면 서명에 포함돼 그 크기가 아니면 저장소가 PUT을 거부한다
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
  // 앞 length바이트(Range 요청, 매직 넘버 검사용). 없으면 null
  getObjectRange: (key: string, length: number) => Promise<Buffer | null>
}

export const assertDeletablePrefix = (prefix: string): void => {
  if (prefix.length < 2 || !prefix.endsWith('/')) throw new Error('삭제 접두사는 비어 있지 않고 /로 끝나야 합니다')
}
