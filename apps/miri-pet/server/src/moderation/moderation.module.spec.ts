import { createFakePrisma } from '../../test/helpers/fake-prisma'
import { PrismaService } from '../prisma/prisma.service'
import { ModerationModule } from './moderation.module'
import { ReportService } from './report.service'
import { Test } from '@nestjs/testing'

describe('ModerationModule', () => {
  it('부팅 시 USER 신고 핸들러를 등록한다', async () => {
    const prisma = createFakePrisma()
    const reports = { registerHandler: jest.fn() }
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: ReportService, useValue: reports },
        { provide: PrismaService, useValue: prisma },
        { provide: ModerationModule, useClass: ModerationModule },
      ],
    }).compile()
    moduleRef.get(ModerationModule).onModuleInit()
    expect(reports.registerHandler).toHaveBeenCalledWith(
      'USER',
      expect.objectContaining({ hide: expect.any(Function) }),
    )
  })
})
