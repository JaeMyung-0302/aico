import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService } from './consent.service'
import { UsersService } from './users.service'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'
const CONSENTS = { terms: true, privacy: true, location: false }

describe('UsersService', () => {
  let prisma: FakePrisma
  let service: UsersService
  const consents = { status: jest.fn() }

  beforeEach(async () => {
    jest.resetAllMocks()
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConsentService, useValue: consents },
      ],
    }).compile()
    service = moduleRef.get(UsersService)
    consents.status.mockResolvedValue(CONSENTS)
  })

  describe('getMe (GET /me)', () => {
    it('displayName·동의 상태를 돌려주고 couple은 아직 null(0E에서 연결)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, displayName: '하늘' })

      await expect(service.getMe(USER_ID)).resolves.toEqual({
        id: USER_ID,
        displayName: '하늘',
        consents: CONSENTS,
        couple: null,
      })
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
        select: { id: true, displayName: true },
      })
      expect(consents.status).toHaveBeenCalledWith(USER_ID)
    })

    it('온보딩 전(displayName 미입력)은 null 그대로', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, displayName: null })
      await expect(service.getMe(USER_ID)).resolves.toMatchObject({ displayName: null })
    })

    it('사용자가 없으면 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(service.getMe(USER_ID)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('updateMe (PATCH /me)', () => {
    it('displayName만 저장하고 갱신된 /me를 돌려준다', async () => {
      prisma.user.update.mockResolvedValue({})
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, displayName: '바다' })

      await expect(service.updateMe(USER_ID, { displayName: '바다' })).resolves.toMatchObject({ displayName: '바다' })
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: USER_ID }, data: { displayName: '바다' } })
    })
  })
})
