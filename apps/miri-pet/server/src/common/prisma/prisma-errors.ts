import { Prisma } from '../../generated/prisma'

// 유니크 제약 위반(P2002) 여부
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

// 유니크 위반이 난 필드 이름들(Postgres: meta.target = ['avatarMediaId'] 형태). 알 수 없으면 빈 배열
export const uniqueViolationTargets = (error: unknown): string[] => {
  if (!isUniqueViolation(error) || !(error instanceof Prisma.PrismaClientKnownRequestError)) return []
  const target: unknown = error.meta?.target
  if (Array.isArray(target)) return target.filter((field): field is string => typeof field === 'string')
  return typeof target === 'string' ? [target] : []
}

// 외래키 제약 위반(P2003): 참조 대상이 검사와 저장 사이에 사라졌다
export const isForeignKeyViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'

export const AVATAR_IN_USE = 'AVATAR_IN_USE'

// 같은 사진을 이미 다른 프로필(사용자·펫)이 쓰고 있을 때
export const isAvatarUniqueViolation = (error: unknown): boolean =>
  uniqueViolationTargets(error).some((field) => field.includes('avatarMediaId'))
