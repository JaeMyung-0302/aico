import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { SessionService } from '../auth/session.service'
import { PrismaService } from '../prisma/prisma.service'
import { UserSuspensionService } from './user-suspension.service'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'

describe('UserSuspensionService', () => {
  let prisma: FakePrisma
  let service: UserSuspensionService
  const sessions = { revokeAll: jest.fn() }

  beforeEach(async () => {
    jest.resetAllMocks()
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserSuspensionService,
        { provide: PrismaService, useValue: prisma },
        { provide: SessionService, useValue: sessions },
      ],
    }).compile()
    service = moduleRef.get(UserSuspensionService)
  })

  it('ACTIVE 사용자를 SUSPENDED로 바꾸고 세션을 전부 폐기한다', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 1 })
    await service.suspend(USER_ID)
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    })
    expect(sessions.revokeAll).toHaveBeenCalledWith(USER_ID)
  })

  it('ACTIVE 사용자가 아니면 404', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 })
    await expect(service.suspend(USER_ID)).rejects.toBeInstanceOf(NotFoundException)
    expect(sessions.revokeAll).not.toHaveBeenCalled()
  })
})
