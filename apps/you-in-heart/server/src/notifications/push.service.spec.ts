import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { PrismaService } from '../prisma/prisma.service'
import { PUSH_SENDER, type PushSender, PushService } from './push.service'

const USER_A = '0199e3a0-0000-7000-8000-0000000000a1'
const USER_B = '0199e3a0-0000-7000-8000-0000000000a2'
const TOKEN_A1 = 'ExponentPushToken[a1]'
const TOKEN_A2 = 'ExponentPushToken[a2]'
const TOKEN_B = 'ExponentPushToken[b]'

describe('PushService', () => {
  let prisma: FakePrisma
  let sender: { send: jest.Mock; getReceipts: jest.Mock } & PushSender
  let service: PushService

  beforeEach(async () => {
    prisma = createFakePrisma()
    sender = { send: jest.fn(), getReceipts: jest.fn() }
    const moduleRef = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUSH_SENDER, useValue: sender },
      ],
    }).compile()
    service = moduleRef.get(PushService)
    prisma.pushToken.findMany.mockResolvedValue([
      { userId: USER_A, expoToken: TOKEN_A1 },
      { userId: USER_A, expoToken: TOKEN_A2 },
      { userId: USER_B, expoToken: TOKEN_B },
    ])
    prisma.pushToken.deleteMany.mockResolvedValue({ count: 0 })
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('sendToUsers', () => {
    it('사용자의 모든 기기 토큰으로 보낸다', async () => {
      sender.send.mockResolvedValue([
        { status: 'ok', id: 'r1' },
        { status: 'ok', id: 'r2' },
      ])
      const result = await service.sendToUsers([{ userId: USER_A, title: '제목', body: '본문', data: { k: 'v' } }])

      expect(prisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { userId: { in: [USER_A] } },
        select: { userId: true, expoToken: true },
      })
      expect(sender.send).toHaveBeenCalledWith([
        { to: TOKEN_A1, title: '제목', body: '본문', data: { k: 'v' }, sound: 'default' },
        { to: TOKEN_A2, title: '제목', body: '본문', data: { k: 'v' }, sound: 'default' },
      ])
      expect(result).toEqual({ sent: 2 })
    })

    it('알림이 없거나 토큰이 없으면 발송하지 않는다', async () => {
      await expect(service.sendToUsers([])).resolves.toEqual({ sent: 0 })
      prisma.pushToken.findMany.mockResolvedValue([])
      await expect(service.sendToUsers([{ userId: USER_A, title: 't', body: 'b' }])).resolves.toEqual({ sent: 0 })
      expect(sender.send).not.toHaveBeenCalled()
    })

    it('티켓이 DeviceNotRegistered면 그 토큰을 즉시 지운다', async () => {
      sender.send.mockResolvedValue([
        { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
        { status: 'ok', id: 'r2' },
      ])
      const result = await service.sendToUsers([{ userId: USER_A, title: 't', body: 'b' }])
      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { expoToken: { in: [TOKEN_A1] } } })
      expect(result).toEqual({ sent: 1 })
    })

    it('data에서 본문·좌표·URL 키(lat·lng·url·uri·body·text)는 빼고 보낸다', async () => {
      sender.send.mockResolvedValue([{ status: 'ok', id: 'r1' }])
      prisma.pushToken.findMany.mockResolvedValue([{ userId: USER_B, expoToken: TOKEN_B }])
      await service.sendToUsers([
        { userId: USER_B, title: 't', body: 'b', data: { entryId: 'e1', body: '일기', Lat: '37.5', url: 'https://x' } },
      ])
      expect(sender.send).toHaveBeenCalledWith([
        { to: TOKEN_B, title: 't', body: 'b', data: { entryId: 'e1' }, sound: 'default' },
      ])
    })

    it('발송 자체가 실패해도 예외를 올리지 않고 0건으로 로그만 남긴다', async () => {
      sender.send.mockRejectedValue(new Error('expo 503'))
      await expect(service.sendToUsers([{ userId: USER_B, title: 't', body: 'b' }])).resolves.toEqual({ sent: 0 })
      expect(Logger.prototype.error).toHaveBeenCalled()
    })
  })

  describe('checkReceipts', () => {
    it('대기 중인 receipt를 조회해 DeviceNotRegistered 토큰을 지우고 대기 목록을 비운다', async () => {
      sender.send.mockResolvedValue([
        { status: 'ok', id: 'r1' },
        { status: 'ok', id: 'r2' },
      ])
      await service.sendToUsers([{ userId: USER_A, title: 't', body: 'b' }])
      sender.getReceipts.mockResolvedValue({
        r1: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
        r2: { status: 'ok' },
      })

      await expect(service.checkReceipts()).resolves.toEqual({ checked: 2, removedTokens: 1 })
      expect(sender.getReceipts).toHaveBeenCalledWith(['r1', 'r2'])
      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { expoToken: { in: [TOKEN_A1] } } })

      await expect(service.checkReceipts()).resolves.toEqual({ checked: 0, removedTokens: 0 })
    })

    it('아직 준비되지 않은 receipt(응답에 없음)는 다음 주기에 다시 확인한다', async () => {
      sender.send.mockResolvedValue([{ status: 'ok', id: 'r1' }])
      prisma.pushToken.findMany.mockResolvedValue([{ userId: USER_B, expoToken: TOKEN_B }])
      await service.sendToUsers([{ userId: USER_B, title: 't', body: 'b' }])
      sender.getReceipts.mockResolvedValueOnce({}).mockResolvedValueOnce({ r1: { status: 'ok' } })

      await expect(service.checkReceipts()).resolves.toEqual({ checked: 0, removedTokens: 0 })
      await expect(service.checkReceipts()).resolves.toEqual({ checked: 1, removedTokens: 0 })
    })
  })

  describe('registerToken', () => {
    it('expoToken 기준 upsert — 다른 계정이 쓰던 기기면 소유자를 옮긴다', async () => {
      await service.registerToken(USER_B, { token: TOKEN_A1, platform: 'ios' })
      expect(prisma.pushToken.upsert).toHaveBeenCalledWith({
        where: { expoToken: TOKEN_A1 },
        create: { userId: USER_B, expoToken: TOKEN_A1, platform: 'IOS' },
        update: { userId: USER_B, platform: 'IOS', lastSeenAt: expect.any(Date) },
      })
    })

    it('L1: 다른 사용자의 토큰을 가져오면 이전·새 소유자를 로그로 남긴다', async () => {
      prisma.pushToken.findUnique.mockResolvedValue({ userId: USER_A })
      await service.registerToken(USER_B, { token: TOKEN_A1, platform: 'ios' })
      expect(prisma.pushToken.findUnique).toHaveBeenCalledWith({
        where: { expoToken: TOKEN_A1 },
        select: { userId: true },
      })
      expect(Logger.prototype.warn).toHaveBeenCalledWith(`[push] token reassigned from ${USER_A} to ${USER_B}`)
    })

    it('L1: 내 토큰 재등록·새 토큰은 재할당 로그가 없다', async () => {
      prisma.pushToken.findUnique.mockResolvedValueOnce({ userId: USER_B }).mockResolvedValueOnce(null)
      await service.registerToken(USER_B, { token: TOKEN_B, platform: 'android' })
      await service.registerToken(USER_B, { token: 'ExponentPushToken[new]', platform: 'android' })
      expect(Logger.prototype.warn).not.toHaveBeenCalled()
    })
  })

  describe('removeToken', () => {
    it('내 토큰만 지운다', async () => {
      await service.removeToken(USER_B, TOKEN_B)
      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_B, expoToken: TOKEN_B } })
    })
  })
})
