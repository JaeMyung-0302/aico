import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { KamisService } from './kamis.service'
import { PrismaService } from '../prisma/prisma.service'

jest.mock('axios')

import axios from 'axios'

const makeKamisItem = (
  itemName: string,
  itemCode: string,
  kindCode = '01',
  dpr1 = '5,000',
  unit = '1kg',
) => ({
  item_name: itemName,
  item_code: itemCode,
  kind_code: kindCode,
  kind_name: '일반',
  unit,
  dpr1,
  dpr2: '-',
  dpr3: '-',
})

const makeResponse = (items: ReturnType<typeof makeKamisItem>[]) => ({
  data: { data: { item: items } },
})

const KAMIS_ITEMS = [
  makeKamisItem('마늘', 'G001'),
  makeKamisItem('깐마늘(국산)', 'G001', '02'),
  makeKamisItem('파', 'G002'),
  makeKamisItem('고추', 'G003'),
  makeKamisItem('계란', 'G004'),
]

describe('KamisService.findMatch', () => {
  let service: KamisService

  beforeAll(async () => {
    jest.useFakeTimers()

    ;(axios.get as jest.Mock).mockImplementation(
      (_url: string, config: { params: { p_item_category_code: string } }) =>
        Promise.resolve(
          makeResponse(
            config.params.p_item_category_code === '100' ? KAMIS_ITEMS : [],
          ),
        ),
    )

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KamisService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'kamis.apiKey' ? 'test-key' : 'test-id',
          },
        },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile()

    service = module.get<KamisService>(KamisService)

    type Internal = { refreshCache: () => Promise<void> }
    const warmup = (service as unknown as Internal).refreshCache()
    // runAllTimersAsync: 타이머 진행 + Promise 플러시 반복 (Jest 29.7+)
    await jest.runAllTimersAsync()
    await warmup
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('정확히 일치하는 이름 → 해당 아이템 반환', () => {
    expect(service.findMatch('마늘')?.itemName).toBe('마늘')
  })

  it('조리법 접두사 제거 후 매칭 ("다진 마늘" → "마늘")', () => {
    expect(service.findMatch('다진 마늘')?.itemCode).toBe('G001')
  })

  it('재료명이 품목명을 포함 ("대파 1대" → "파")', () => {
    expect(service.findMatch('대파 1대')?.itemName).toBe('파')
  })

  it('별칭 매칭: "대파" → "파"', () => {
    expect(service.findMatch('대파')?.itemName).toBe('파')
  })

  it('별칭 매칭: "청양고추" → "고추"', () => {
    expect(service.findMatch('청양고추')?.itemName).toBe('고추')
  })

  it('별칭 매칭: "달걀" → "계란"', () => {
    expect(service.findMatch('달걀')?.itemName).toBe('계란')
  })

  it('캐시에 없는 재료 → null', () => {
    expect(service.findMatch('트러플')).toBeNull()
  })

  it('가격 파싱: 쉼표 포함 문자열 → 숫자', () => {
    expect(service.findMatch('마늘')?.price).toBe(5000)
  })
})
