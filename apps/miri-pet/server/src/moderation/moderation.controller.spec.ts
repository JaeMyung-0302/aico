import { Test } from '@nestjs/testing'
import { ConsentGuard } from '../auth/guards/consent.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { BlockService } from './block.service'
import { BlocksController, ReportsController } from './moderation.controller'
import { ReportService } from './report.service'

const ME = { id: '0199e3a0-0000-7000-8000-0000000000a1', role: 'USER' as const }
const OTHER = '0199e3a0-0000-7000-8000-0000000000b1'

describe('moderation controllers', () => {
  const blocks = { block: jest.fn(), unblock: jest.fn(), list: jest.fn() }
  const reports = { create: jest.fn() }
  let blocksController: BlocksController
  let reportsController: ReportsController

  beforeEach(async () => {
    jest.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [BlocksController, ReportsController],
      providers: [
        { provide: BlockService, useValue: blocks },
        { provide: ReportService, useValue: reports },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: () => true })
      .compile()
    blocksController = moduleRef.get(BlocksController)
    reportsController = moduleRef.get(ReportsController)
  })

  it('POST/DELETE/GET /blocks는 로그인 사용자 기준으로 위임한다', async () => {
    blocks.list.mockResolvedValue({ items: [] })
    await blocksController.block(ME, OTHER)
    await blocksController.unblock(ME, OTHER)
    await expect(blocksController.list(ME)).resolves.toEqual({ items: [] })
    expect(blocks.block).toHaveBeenCalledWith(ME.id, OTHER)
    expect(blocks.unblock).toHaveBeenCalledWith(ME.id, OTHER)
    expect(blocks.list).toHaveBeenCalledWith(ME.id)
  })

  it('POST /reports는 신고자 id를 붙여 위임한다', async () => {
    reports.create.mockResolvedValue({ id: 'r1' })
    const body = { targetType: 'USER' as const, targetId: OTHER, reason: 'SPAM' as const }
    await expect(reportsController.create(ME, body)).resolves.toEqual({ id: 'r1' })
    expect(reports.create).toHaveBeenCalledWith(ME.id, body)
  })
})
