import { Prisma } from '../../src/generated/prisma'

// Prisma 유니크 위반(P2002) 에러를 만든다
export const uniqueViolation = (target = 'field'): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${target}`, {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: [target] },
  })
