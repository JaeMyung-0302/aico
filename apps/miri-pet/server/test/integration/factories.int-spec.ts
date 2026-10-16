import type { INestApplication } from '@nestjs/common'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'
import { createPet, createPost, createUser } from './factories'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('통합 테스트 팩토리·truncate (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
  })

  it('user → pet → post를 만들고 uuid v7 id를 받는다', async () => {
    const user = await createUser(prisma)
    const pet = await createPet(prisma, user.id)
    const post = await createPost(prisma, user.id, [pet.id])
    expect(post.authorId).toBe(user.id)
    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/)
    expect(await prisma.postPet.count({ where: { postId: post.id } })).toBe(1)
  })

  it('truncate 후에는 이전 테스트 데이터가 남지 않는다', async () => {
    expect(await prisma.user.count()).toBe(0)
    expect(await prisma.post.count()).toBe(0)
  })
})
