import { Prisma, type UserStatus } from '../../generated/prisma'

export type LockedUser = { id: string; status: UserStatus }

type RawQueryClient = Pick<Prisma.TransactionClient, '$queryRaw'>

// User 행을 FOR UPDATE로 잠근다. 항상 id 순서로 잠가 두 트랜잭션이 서로를 기다리는 교착을 막는다.
// 잠금 순서 규칙: User → CoupleInvite (join·회원 탈퇴·초대 발급 공통). 없는 id는 결과에서 빠진다
export const lockUsers = (tx: RawQueryClient, userIds: readonly string[]): Promise<LockedUser[]> => {
  const ids = [...new Set(userIds)].sort()
  const params = Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))
  const query = Prisma.sql`SELECT id, status FROM "User" WHERE id IN (${params}) ORDER BY id FOR UPDATE`
  return tx.$queryRaw<LockedUser[]>(query)
}
