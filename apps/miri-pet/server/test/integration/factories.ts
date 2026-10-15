import { randomUUID } from 'node:crypto'
import type { Pet, Post, PrismaClient, User } from '../../src/generated/prisma'

const shortId = () => randomUUID().replace(/-/g, '').slice(0, 10)

export const createUser = (
  prisma: PrismaClient,
  overrides: Partial<Pick<User, 'nickname' | 'role' | 'status'>> = {},
): Promise<User> =>
  prisma.user.create({
    data: { nickname: `user_${shortId()}`, ...overrides },
  })

export const createPet = (
  prisma: PrismaClient,
  ownerId: string,
  overrides: Partial<Pick<Pet, 'name' | 'species' | 'size'>> = {},
): Promise<Pet> =>
  prisma.pet.create({
    data: { ownerId, name: '보리', species: 'DOG', size: 'S', ...overrides },
  })

export const createPost = (
  prisma: PrismaClient,
  authorId: string,
  petIds: string[],
  caption = '산책 다녀왔어요',
): Promise<Post> =>
  prisma.post.create({
    data: {
      authorId,
      caption,
      pets: { create: petIds.map((petId) => ({ petId })) },
    },
  })
