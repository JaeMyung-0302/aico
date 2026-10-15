import { UnprocessableEntityException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { CreatePlaceReportRequest } from '@miri-pet/shared'
import { Prisma } from '../generated/prisma'
import { MediaService } from '../media/media.service'
import { PrismaService } from '../prisma/prisma.service'
import { PlaceReportsService } from './place-reports.service'
import { PlacesService } from './places.service'

const REPORTER_ID = '01890a5d-ac96-774b-bcce-b302099a8001'
const MEDIA_ID = '01890a5d-ac96-774b-bcce-b302099a8002'

const NEW_REPORT: CreatePlaceReportRequest = {
  kind: 'NEW',
  name: '사진 카페',
  address: '서울 성동구 연무장길 2',
  category: 'CAFE',
  allowedSizes: ['S'],
  indoorAllowed: true,
  lat: 37.54,
  lng: 127.05,
  mediaIds: [MEDIA_ID],
}

const knownError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test', meta })

const buildService = async (createError: unknown): Promise<PlaceReportsService> => {
  const prisma = {
    placeReportImage: { count: jest.fn(async () => 0) },
    placeReport: { create: jest.fn(async () => Promise.reject(createError)) },
  }
  const moduleRef = await Test.createTestingModule({
    providers: [
      PlaceReportsService,
      { provide: PrismaService, useValue: prisma },
      { provide: PlacesService, useValue: { assertActive: jest.fn(async () => undefined) } },
      { provide: MediaService, useValue: { assertUsable: jest.fn(async () => undefined) } },
    ],
  }).compile()
  return moduleRef.get(PlaceReportsService)
}

describe('PlaceReportsService.create', () => {
  it('검사 직후 정리 크론이 사진을 지우면(FK 위반 P2003) 500 대신 422 MEDIA_NOT_USABLE', async () => {
    const service = await buildService(knownError('P2003', { field_name: 'PlaceReportImage_mediaId_fkey' }))
    await expect(service.create(REPORTER_ID, NEW_REPORT)).rejects.toBeInstanceOf(UnprocessableEntityException)
  })

  it('알 수 없는 DB 에러는 그대로 던진다', async () => {
    const error = knownError('P2010')
    const service = await buildService(error)
    await expect(service.create(REPORTER_ID, NEW_REPORT)).rejects.toBe(error)
  })
})
