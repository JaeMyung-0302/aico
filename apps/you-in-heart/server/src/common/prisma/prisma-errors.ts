import { Prisma } from '../../generated/prisma'

// 유니크 제약 위반(P2002) 여부
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

// 외래 키 제약 위반(P2003). 참조하려던 행이 같은 순간 지워진 경쟁(장소·일기 삭제 중 연결)
export const isForeignKeyViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
