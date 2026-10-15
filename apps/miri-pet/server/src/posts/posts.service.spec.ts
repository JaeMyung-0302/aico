import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { uniqueViolation } from '../../test/helpers/prisma-errors'
import { EventsService } from '../events/events.service'
import { MEDIA_NOT_USABLE, MediaService } from '../media/media.service'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { PostsRepository, visiblePostWhere } from './posts.repository'
import { PostsService } from './posts.service'

const AUTHOR = '0199e3a0-0000-7000-8000-00000000000a'
const MEDIA = '0199e3a0-0000-7000-8000-000000000001'
const PET = '0199e3a0-0000-7000-8000-000000000002'
const PLACE = '0199e3a0-0000-7000-8000-000000000003'

describe('PostsService.create', () => {
  let service: PostsService
  const prisma = {
    postImage: { count: jest.fn() },
    pet: { count: jest.fn() },
    post: { create: jest.fn() },
    place: { count: jest.fn() },
  }
  const media = { assertUsable: jest.fn() }
  const events = { capture: jest.fn() }

  beforeEach(async () => {
    prisma.postImage.count.mockReset().mockResolvedValue(0)
    prisma.pet.count.mockReset().mockResolvedValue(1)
    prisma.post.create.mockReset()
    prisma.place.count.mockReset().mockResolvedValue(1)
    media.assertUsable.mockReset().mockResolvedValue(undefined)
    events.capture.mockReset()
    const moduleRef = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsRepository, useValue: {} },
        { provide: BlockService, useValue: {} },
        { provide: MediaService, useValue: media },
        { provide: EventsService, useValue: events },
        { provide: ConfigService, useValue: new ConfigService({ r2: { publicBaseUrl: 'https://img.test' } }) },
      ],
    }).compile()
    service = moduleRef.get(PostsService)
  })

  const body = { caption: '', mediaIds: [MEDIA], petIds: [PET] }

  it('같은 이미지를 두 번 넣으면 400', async () => {
    await expect(service.create(AUTHOR, { ...body, mediaIds: [MEDIA, MEDIA] })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('이미 다른 게시물에 붙은 이미지 → 422 MEDIA_NOT_USABLE', async () => {
    prisma.postImage.count.mockResolvedValue(1)
    await expect(service.create(AUTHOR, body)).rejects.toMatchObject({
      response: { code: MEDIA_NOT_USABLE },
    })
  })

  it('동시 게시로 PostImage.mediaId 유니크 위반 → 422 MEDIA_NOT_USABLE', async () => {
    prisma.post.create.mockRejectedValue(uniqueViolation('mediaId'))
    const error = await service.create(AUTHOR, body).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(UnprocessableEntityException)
    expect(error).toMatchObject({ response: { code: MEDIA_NOT_USABLE } })
    expect(events.capture).not.toHaveBeenCalled()
  })

  it('다른 유니크 위반·일반 오류는 그대로 던진다', async () => {
    const other = uniqueViolation('order')
    prisma.post.create.mockRejectedValue(other)
    await expect(service.create(AUTHOR, body)).rejects.toBe(other)
  })

  it('남의 펫을 태그 → 422 PET_NOT_USABLE', async () => {
    prisma.pet.count.mockResolvedValue(0)
    await expect(service.create(AUTHOR, body)).rejects.toMatchObject({ response: { code: 'PET_NOT_USABLE' } })
  })
})

describe('PostsService.create 장소 태그', () => {
  let service: PostsService
  const prisma = {
    postImage: { count: jest.fn() },
    pet: { count: jest.fn() },
    post: { create: jest.fn() },
    place: { count: jest.fn() },
  }

  beforeEach(async () => {
    prisma.postImage.count.mockReset().mockResolvedValue(0)
    prisma.pet.count.mockReset().mockResolvedValue(1)
    prisma.post.create.mockReset().mockRejectedValue(new Error('stop after create'))
    prisma.place.count.mockReset().mockResolvedValue(1)
    const moduleRef = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsRepository, useValue: {} },
        { provide: BlockService, useValue: {} },
        { provide: MediaService, useValue: { assertUsable: jest.fn() } },
        { provide: EventsService, useValue: { capture: jest.fn() } },
        { provide: ConfigService, useValue: new ConfigService({}) },
      ],
    }).compile()
    service = moduleRef.get(PostsService)
  })

  const body = { caption: '', mediaIds: [MEDIA], petIds: [PET] }

  it('placeId가 ACTIVE 장소가 아니면 422 PLACE_NOT_USABLE (게시물을 만들지 않는다)', async () => {
    prisma.place.count.mockResolvedValue(0)
    await expect(service.create(AUTHOR, { ...body, placeId: PLACE })).rejects.toMatchObject({
      response: { code: 'PLACE_NOT_USABLE' },
    })
    expect(prisma.place.count).toHaveBeenCalledWith({ where: { id: PLACE, status: 'ACTIVE' } })
    expect(prisma.post.create).not.toHaveBeenCalled()
  })

  it('ACTIVE 장소면 placeId를 저장한다', async () => {
    await service.create(AUTHOR, { ...body, placeId: PLACE }).catch(() => undefined)
    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ placeId: PLACE }) }),
    )
  })

  it('placeId가 없으면 장소를 조회하지 않고 null로 저장한다', async () => {
    await service.create(AUTHOR, body).catch(() => undefined)
    expect(prisma.place.count).not.toHaveBeenCalled()
    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ placeId: null }) }),
    )
  })
})

describe('PostsService.listByPlace', () => {
  let service: PostsService
  const VIEWER = '0199e3a0-0000-7000-8000-00000000000b'
  const BLOCKED = '0199e3a0-0000-7000-8000-00000000000c'
  const CURSOR = '0199e3a0-0000-7000-8000-0000000000ff'
  const prisma = { place: { count: jest.fn() } }
  const repository = { findPage: jest.fn() }
  const blocks = { hiddenUserIds: jest.fn() }

  beforeEach(async () => {
    prisma.place.count.mockReset().mockResolvedValue(1)
    repository.findPage.mockReset().mockResolvedValue({ items: [], nextCursor: null, hasMore: false })
    blocks.hiddenUserIds.mockReset().mockResolvedValue(new Set([BLOCKED]))
    const moduleRef = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsRepository, useValue: repository },
        { provide: BlockService, useValue: blocks },
        { provide: MediaService, useValue: {} },
        { provide: EventsService, useValue: {} },
        { provide: ConfigService, useValue: new ConfigService({}) },
      ],
    }).compile()
    service = moduleRef.get(PostsService)
  })

  it('ACTIVE 장소가 아니면 404', async () => {
    prisma.place.count.mockResolvedValue(0)
    await expect(service.listByPlace(VIEWER, PLACE, { limit: 20 })).rejects.toBeInstanceOf(NotFoundException)
    expect(repository.findPage).not.toHaveBeenCalled()
  })

  it('장소 태그 + 피드와 같은 가시성(차단·숨김·삭제·비활성 작성자) + 커서로 한 페이지', async () => {
    const page = await service.listByPlace(VIEWER, PLACE, { cursor: CURSOR, limit: 12 })
    expect(page).toEqual({ items: [], nextCursor: null })
    expect(repository.findPage).toHaveBeenCalledWith(
      VIEWER,
      {
        placeId: PLACE,
        ...visiblePostWhere(VIEWER, new Set([BLOCKED])),
        id: { lt: CURSOR },
      },
      12,
    )
  })
})
