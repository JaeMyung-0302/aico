import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '../generated/prisma'

// errorFormat 'minimal': 에러 메시지에 호출 위치·소스 코드 조각·인자 값(일기 본문 등)을 붙이지 않는다(Sentry·로그 유출 방지)
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ errorFormat: 'minimal' })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
