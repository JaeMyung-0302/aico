import { Prisma } from '../../generated/prisma'

// 유니크 제약 위반(P2002) 여부
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
