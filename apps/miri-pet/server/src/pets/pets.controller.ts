import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common'
import {
  type CreatePetRequest,
  createPetRequestSchema,
  idSchema,
  type Pet,
  type UpdatePetRequest,
  updatePetRequestSchema,
} from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { PetsService } from './pets.service'

// 내 펫만 다룬다(소유자 외 404). 다른 사용자 프로필의 펫 노출은 Phase 4(차단 필터 필수 인자)에서 추가
@Controller('pets')
@Authenticated()
export class PetsController {
  constructor(private readonly pets: PetsService) {}

  @Get()
  list(@CurrentUser() me: AuthUser): Promise<Pet[]> {
    return this.pets.list(me.id)
  }

  @Post()
  create(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createPetRequestSchema)) body: CreatePetRequest,
  ): Promise<Pet> {
    return this.pets.create(me.id, body)
  }

  @Get(':id')
  get(@CurrentUser() me: AuthUser, @Param('id', new ZodValidationPipe(idSchema)) id: string): Promise<Pet> {
    return this.pets.get(me.id, id)
  }

  @Patch(':id')
  update(
    @CurrentUser() me: AuthUser,
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(updatePetRequestSchema)) body: UpdatePetRequest,
  ): Promise<Pet> {
    return this.pets.update(me.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() me: AuthUser, @Param('id', new ZodValidationPipe(idSchema)) id: string): Promise<void> {
    return this.pets.remove(me.id, id)
  }
}
