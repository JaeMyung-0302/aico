import { Prisma } from '../../src/generated/prisma'

// DB 제약 확인용: 쿼리가 Prisma 알려진 에러로 실패하면 그 코드(P2002 등), 성공하면 null
export const uniqueViolationCode = async (query: Promise<unknown>): Promise<string | null> => {
  try {
    await query
    return null
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code
    throw error
  }
}
