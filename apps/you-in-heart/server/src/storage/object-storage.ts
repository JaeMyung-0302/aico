// R2(S3 호환) 연동은 이 인터페이스 뒤에 둔다 → 통합 테스트는 메모리 구현으로 바꿔 네트워크를 타지 않는다
// 버킷은 private 하나(architecture §11). presign은 사진 업로드(1D)에서 추가한다
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE')

export type PutObjectInput = { key: string; body: Buffer; contentType: string }

export type ObjectStorage = {
  putObject: (input: PutObjectInput) => Promise<void>
  // 없으면 null
  head: (key: string) => Promise<{ size: number } | null>
  // 접두사 아래 전체 키(페이지를 끝까지 따라간다)
  listKeys: (prefix: string) => Promise<string[]>
  deleteObjects: (keys: readonly string[]) => Promise<void>
  // 접두사 아래를 1,000개씩 지운다. 지운 개수. 빈 접두사·'/'로 끝나지 않는 접두사는 거부
  deletePrefix: (prefix: string) => Promise<number>
}

export const assertDeletablePrefix = (prefix: string): void => {
  if (prefix.length < 2 || !prefix.endsWith('/')) throw new Error('삭제 접두사는 비어 있지 않고 /로 끝나야 합니다')
}
