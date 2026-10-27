import { PrismaService } from '../../src/prisma/prisma.service'
import { createUser } from './factories'
import { truncateAll } from './truncate'

// 에러 메시지가 Sentry·로그로 갈 때 호출 위치·소스 코드 조각·인자 값이 붙지 않게 errorFormat: 'minimal'
describe('PrismaService 에러 형식 (실DB)', () => {
  const prisma = new PrismaService()

  beforeAll(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // 기본 형식은 "invocation in <파일 경로>" 뒤에 호출부 앞뒤 소스 줄을 붙인다 → 소스에 있는 값까지 메시지에 실린다
  it('unique 위반 메시지에 파일 경로·소스 코드 조각(값 포함)이 없다', async () => {
    const secret = '비밀이름'
    const user = await createUser(prisma, { displayName: secret })
    const error: unknown = await prisma.user
      .create({ data: { id: user.id, displayName: secret } })
      .then(() => null)
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(Error)
    const message = error instanceof Error ? error.message : ''
    expect(message).toMatch(/Unique constraint failed/)
    expect(message).not.toContain(__filename)
    expect(message).not.toMatch(/비밀이름|→/)
  })
})
