import { randomUUID } from 'node:crypto'
import type { PushMessage, PushSender, PushTicket } from '../../src/notifications/push.service'
import type { PrismaClient } from '../../src/generated/prisma'

// Expo Push 대역: 보낸 메시지를 모아 둔다
export const createFakePushSender = () => {
  let sent: readonly PushMessage[] = []
  const sender = {
    send: jest.fn(async (messages: PushMessage[]): Promise<PushTicket[]> => {
      sent = [...sent, ...messages]
      return messages.map(() => ({ status: 'ok' as const, id: randomUUID() }))
    }),
    getReceipts: jest.fn(async () => ({})),
  } satisfies PushSender
  return {
    sender,
    sent: () => sent,
    reset: () => {
      sent = []
      sender.send.mockClear()
    },
  }
}

// 이미지 없는 게시물 n개를 순서대로 만든다(uuid v7이라 나중에 만든 것이 더 큰 id)
export const seedPosts = async (
  prisma: PrismaClient,
  authorId: string,
  count: number,
  overrides: { hiddenAt?: Date; deletedAt?: Date } = {},
): Promise<string[]> => {
  const pet = await prisma.pet.create({ data: { ownerId: authorId, name: '콩이', species: 'DOG', size: 'M' } })
  const ids: string[] = []
  for (let index = 0; index < count; index += 1) {
    const post = await prisma.post.create({
      data: { authorId, caption: `post ${index}`, ...overrides, pets: { create: [{ petId: pet.id }] } },
      select: { id: true },
    })
    ids.push(post.id)
  }
  return ids
}

export const ageAccounts = (prisma: PrismaClient, userIds: string[]) =>
  prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { createdAt: new Date(Date.now() - 4 * 86_400_000) },
  })
