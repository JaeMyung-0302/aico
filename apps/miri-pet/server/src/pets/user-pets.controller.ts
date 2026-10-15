import { Controller, Get, Param } from '@nestjs/common'
import { idSchema, type PublicPetList } from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { PetsService } from './pets.service'

// 다른 사용자 프로필의 반려동물 탭(공개 요약만). 노출 조건은 GET /users/:id 와 같다
@Controller('users')
@Authenticated()
export class UserPetsController {
  constructor(private readonly pets: PetsService) {}

  @Get(':id/pets')
  list(@CurrentUser() me: AuthUser, @Param('id', new ZodValidationPipe(idSchema)) id: string): Promise<PublicPetList> {
    return this.pets.listPublic(me.id, id)
  }
}
