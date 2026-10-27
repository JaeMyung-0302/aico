import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { AllowWithoutCouple } from '../couples/decorators/allow-without-couple.decorator'
import { PrismaService } from '../prisma/prisma.service'

@SkipThrottle()
@AllowWithoutCouple()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok'; db: 'up' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ok', db: 'up' }
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' })
    }
  }
}
