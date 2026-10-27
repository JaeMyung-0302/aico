import type { Prisma } from '../generated/prisma'

type RawQueryClient = Pick<Prisma.TransactionClient, '$queryRaw'>

// 일기 행을 FOR UPDATE로 잠근다(같은 커플 조건 포함). 없으면 false.
// 잠금 동안 사진 insert(FK 검사)가 기다리므로 "삭제 중 새 사진" 경쟁과 "엔트리당 20장" 초과 경쟁을 막는다
export const lockEntry = async (tx: RawQueryClient, coupleId: string, entryId: string): Promise<boolean> => {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "DiaryEntry" WHERE id = ${entryId}::uuid AND "coupleId" = ${coupleId}::uuid FOR UPDATE`
  return rows.length > 0
}
