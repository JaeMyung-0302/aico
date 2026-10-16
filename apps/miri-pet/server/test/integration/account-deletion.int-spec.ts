import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { JWKS_RESOLVER, KAKAO_ISSUER } from '../../src/auth/id-token-verifier'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { KakaoUnlinkClient } from '../../src/users/kakao-unlink.client'
import { createTestIdTokenKit, type TestIdTokenKit } from '../helpers/id-token-test-keys'
import { bearer, REQUIRED_CONSENTS, withEnv } from './auth-helpers'
import { createPost, createUser } from './factories'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const KAKAO_APP_KEY = 'int-test-kakao-key'

describe('DELETE /me 회원 탈퇴 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let kit: TestIdTokenKit
  let restoreEnv: () => void
  const kakaoUnlink = { unlink: jest.fn() }
  const memory = createInMemoryStorage()

  beforeAll(async () => {
    restoreEnv = withEnv({ NODE_ENV: 'test', KAKAO_NATIVE_APP_KEY: KAKAO_APP_KEY })
    kit = await createTestIdTokenKit()
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(JWKS_RESOLVER)
        .useValue(() => kit.jwks)
        .overrideProvider(KakaoUnlinkClient)
        .useValue(kakaoUnlink)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(memory.storage),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    kakaoUnlink.unlink.mockReset().mockResolvedValue(undefined)
    memory.reset()
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const http = () => request(app.getHttpServer())

  const kakaoLogin = async (sub: string) => {
    const idToken = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub })
    const res = await http().post('/api/v1/auth/kakao').send({ idToken }).expect(200)
    const me = await http()
      .get('/api/v1/me')
      .set(...bearer(res.body.accessToken))
      .expect(200)
    return { ...res.body, userId: me.body.id }
  }

  it('탈퇴 후 refresh 401, access 401, nickname null, 카카오 unlink 1회', async () => {
    const me = await kakaoLogin('kakao-delete-1')

    await http()
      .delete('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(204)

    await http().post('/api/v1/auth/refresh').send({ refreshToken: me.refreshToken }).expect(401)
    await http()
      .get('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(401)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.userId } })
    expect(user).toMatchObject({ status: 'DELETED', nickname: null, bio: null })
    expect(user.deletedAt).not.toBeNull()
    expect(await prisma.authAccount.count({ where: { userId: me.userId } })).toBe(0)
    expect(await prisma.session.count({ where: { userId: me.userId } })).toBe(0)
    expect(kakaoUnlink.unlink).toHaveBeenCalledTimes(1)
    expect(kakaoUnlink.unlink).toHaveBeenCalledWith('kakao-delete-1')
  })

  it('같은 카카오 계정으로 다시 로그인하면 새 User가 생긴다', async () => {
    const before = await kakaoLogin('kakao-again')
    await http()
      .delete('/api/v1/me')
      .set(...bearer(before.accessToken))
      .expect(204)
    const after = await kakaoLogin('kakao-again')
    expect(after.isNewUser).toBe(true)
    expect(after.userId).not.toBe(before.userId)
  })

  it('팔로우·좋아요(likeCount 감소)·푸시 토큰을 지우고 보낸 메시지 내용을 파기한다', async () => {
    const me = await kakaoLogin('kakao-rel')
    const other = await createUser(prisma)
    const post = await createPost(prisma, other.id, [])
    await prisma.like.create({ data: { userId: me.userId, postId: post.id } })
    await prisma.post.update({ where: { id: post.id }, data: { likeCount: 1 } })
    await prisma.follow.createMany({
      data: [
        { followerId: me.userId, followeeId: other.id },
        { followerId: other.id, followeeId: me.userId },
      ],
    })
    await prisma.pushToken.create({ data: { userId: me.userId, expoToken: 'ExponentPushToken[abc]', platform: 'IOS' } })
    const [lowId, highId] = [me.userId, other.id].sort()
    const conversation = await prisma.conversation.create({ data: { userLowId: lowId, userHighId: highId } })
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: me.userId,
        body: '안녕하세요',
        clientMessageId: 'client-msg-1',
      },
    })

    await http()
      .delete('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(204)

    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).likeCount).toBe(0)
    expect(await prisma.like.count({ where: { userId: me.userId } })).toBe(0)
    expect(await prisma.follow.count()).toBe(0)
    expect(await prisma.pushToken.count({ where: { userId: me.userId } })).toBe(0)
    expect(await prisma.message.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({
      body: null,
      senderId: null,
    })
  })

  it('차단 관계(양방향)를 지우고 내가 쓴 신고 상세(detail)는 파기한다(신고 근거 행은 남김)', async () => {
    const me = await kakaoLogin('kakao-block')
    const other = await createUser(prisma)
    const third = await createUser(prisma)
    await prisma.block.createMany({
      data: [
        { blockerId: me.userId, blockedId: other.id },
        { blockerId: third.id, blockedId: me.userId },
        { blockerId: other.id, blockedId: third.id },
      ],
    })
    const mine = await prisma.report.create({
      data: {
        reporterId: me.userId,
        targetType: 'USER',
        targetId: other.id,
        reason: 'ETC',
        detail: '010-1234-5678로 연락',
      },
    })
    const theirs = await prisma.report.create({
      data: { reporterId: other.id, targetType: 'USER', targetId: third.id, reason: 'ETC', detail: '남의 신고' },
    })

    await http()
      .delete('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(204)

    expect(await prisma.block.count({ where: { OR: [{ blockerId: me.userId }, { blockedId: me.userId }] } })).toBe(0)
    expect(await prisma.block.count()).toBe(1)
    expect(await prisma.report.findUniqueOrThrow({ where: { id: mine.id } })).toMatchObject({
      detail: null,
      reason: 'ETC',
    })
    expect((await prisma.report.findUniqueOrThrow({ where: { id: theirs.id } })).detail).toBe('남의 신고')
  })

  it('카카오 unlink가 실패해도 탈퇴는 완료된다', async () => {
    kakaoUnlink.unlink.mockRejectedValue(new Error('kakao 500'))
    const me = await kakaoLogin('kakao-fail')
    await http()
      .delete('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(204)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: me.userId } })).status).toBe('DELETED')
  })

  describe('Phase 2: 펫·접종·증명서', () => {
    // 동의(증명서 포함) 후 펫 + 프로필 사진 + 증명서가 붙은 접종 기록을 만든다
    const setupPetRecords = async (sub: string) => {
      const me = await kakaoLogin(sub)
      await http()
        .post('/api/v1/me/consents')
        .set(...bearer(me.accessToken))
        .send({ isAge14OrOlder: true, consents: REQUIRED_CONSENTS })
        .expect(204)
      const avatarId = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
      const pet = await http()
        .post('/api/v1/pets')
        .set(...bearer(me.accessToken))
        .send({ name: '보리', species: 'DOG', size: 'S', avatarMediaId: avatarId })
        .expect(201)
      const certificateId = await uploadImage(app, prisma, memory, me.accessToken, 'CERTIFICATE')
      await http()
        .post(`/api/v1/pets/${pet.body.id}/vaccinations`)
        .set(...bearer(me.accessToken))
        .send({ type: 'DHPPL', administeredOn: '2026-10-01', certificateMediaIds: [certificateId] })
        .expect(201)
      await http()
        .get(`/api/v1/vaccinations/${(await prisma.vaccination.findFirstOrThrow()).id}/certificates`)
        .set(...bearer(me.accessToken))
        .expect(200)
      return { me, avatarId, certificateId }
    }

    it('펫·접종·증명서 행과 증명서·펫 사진 R2 객체를 지운다 (Pet 0행)', async () => {
      const { me, avatarId, certificateId } = await setupPetRecords('kakao-pets')
      const certificateKey = (await prisma.media.findUniqueOrThrow({ where: { id: certificateId } })).key
      memory.storage.deleteObjects.mockClear()

      await http()
        .delete('/api/v1/me')
        .set(...bearer(me.accessToken))
        .expect(204)

      expect(await prisma.pet.count()).toBe(0)
      expect(await prisma.vaccination.count()).toBe(0)
      expect(await prisma.vaccinationCertificate.count()).toBe(0)
      expect(await prisma.mediaAccessLog.count()).toBe(0)
      expect(await prisma.media.count({ where: { id: { in: [avatarId, certificateId] } } })).toBe(0)
      expect(memory.storage.deleteObjects).toHaveBeenCalledWith(
        expect.arrayContaining([
          { bucket: 'PRIVATE', key: certificateKey },
          { bucket: 'PUBLIC', key: `p/${avatarId}/1440.jpg` },
          { bucket: 'PUBLIC', key: `p/${avatarId}/480.jpg` },
        ]),
      )
      expect(memory.keys()).toEqual([])
    })

    it('R2 삭제가 실패해도 탈퇴는 완료된다 (DB는 이미 커밋)', async () => {
      const { me } = await setupPetRecords('kakao-r2-fail')
      memory.storage.deleteObjects.mockRejectedValueOnce(new Error('r2 503'))
      await http()
        .delete('/api/v1/me')
        .set(...bearer(me.accessToken))
        .expect(204)
      expect((await prisma.user.findUniqueOrThrow({ where: { id: me.userId } })).status).toBe('DELETED')
      expect(await prisma.pet.count()).toBe(0)
    })
  })

  describe('보안 리뷰 H1·L5', () => {
    it('H1: 펫과 무관한 내 소유 Media 전체(게시용·프로필·미완료 업로드)를 DB·R2에서 지운다', async () => {
      const me = await kakaoLogin('kakao-media')
      await http()
        .post('/api/v1/me/consents')
        .set(...bearer(me.accessToken))
        .send({ isAge14OrOlder: true, consents: REQUIRED_CONSENTS })
        .expect(204)
      const postImage = await uploadImage(app, prisma, memory, me.accessToken, 'POST')
      const avatar = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
      const looseCertificate = await uploadImage(app, prisma, memory, me.accessToken, 'CERTIFICATE')
      await http()
        .patch('/api/v1/me')
        .set(...bearer(me.accessToken))
        .send({ avatarMediaId: avatar })
        .expect(200)
      const pending = await http()
        .post('/api/v1/media/uploads')
        .set(...bearer(me.accessToken))
        .send({ purpose: 'POST', mime: 'image/jpeg', bytes: 10 })
        .expect(201)
      await memory.storage.putObject({
        bucket: 'PRIVATE',
        key: `incoming/${pending.body.mediaId}`,
        body: Buffer.from('half'),
        contentType: 'image/jpeg',
      })
      const other = await createUser(prisma)
      const othersMedia = await prisma.media.create({
        data: {
          ownerId: other.id,
          purpose: 'POST',
          bucket: 'PUBLIC',
          key: 'incoming/others',
          mime: 'image/jpeg',
          bytes: 1,
        },
      })

      await http()
        .delete('/api/v1/me')
        .set(...bearer(me.accessToken))
        .expect(204)

      const mine = [postImage, avatar, looseCertificate, pending.body.mediaId]
      expect(await prisma.media.count({ where: { id: { in: mine } } })).toBe(0)
      expect(await prisma.media.count({ where: { ownerId: me.userId } })).toBe(0)
      expect(await prisma.media.findUnique({ where: { id: othersMedia.id } })).not.toBeNull()
      expect(memory.keys()).toEqual([])
    })

    it('L5: 내 장소 제보는 남기되 reporterId와 자유 입력 note를 지운다(남의 제보는 그대로)', async () => {
      const me = await kakaoLogin('kakao-place')
      const other = await createUser(prisma)
      const payload = {
        kind: 'NEW',
        name: '제보 카페',
        address: '서울',
        category: 'CAFE',
        allowedSizes: ['S'],
        indoorAllowed: true,
        lat: 37.5,
        lng: 127,
        note: '사장님 번호 010-0000-0000',
      }
      const mine = await prisma.placeReport.create({ data: { reporterId: me.userId, payload } })
      const theirs = await prisma.placeReport.create({ data: { reporterId: other.id, payload } })

      await http()
        .delete('/api/v1/me')
        .set(...bearer(me.accessToken))
        .expect(204)

      const kept = await prisma.placeReport.findUniqueOrThrow({ where: { id: mine.id } })
      expect(kept.reporterId).toBeNull()
      expect(kept.payload).toEqual(Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'note')))
      const untouched = await prisma.placeReport.findUniqueOrThrow({ where: { id: theirs.id } })
      expect(untouched).toMatchObject({ reporterId: other.id, payload })
    })
  })
})
