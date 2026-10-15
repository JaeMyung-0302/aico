import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '@miri-pet/shared'

// 앱 원격 기능 플래그. 비밀값이 없으므로 로그인 전에도 조회할 수 있다
@Controller('config')
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getConfig(): AppConfig {
    return { isGpsEnabled: this.config.get<boolean>('isGpsEnabled') === true }
  }
}
