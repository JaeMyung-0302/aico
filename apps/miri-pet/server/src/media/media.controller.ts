import { Body, Controller, Header, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import {
  type CreateUploadRequest,
  createUploadRequestSchema,
  type CreateUploadResponse,
  idSchema,
  type Media,
} from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { MediaService } from './media.service'

// 사용자당 라우트별 분당 20회 (전역 IP 120회/분과 별개)
export const MEDIA_UPLOAD_THROTTLE = { ttl: 60_000, limit: 20 }

// D7·D8 업로드: POST /media/uploads → (클라이언트가 presigned PUT) → POST /media/:id/complete
@Controller('media')
@Authenticated()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  @UserThrottle({ name: 'media-uploads', ...MEDIA_UPLOAD_THROTTLE })
  // presigned URL은 캐시(프록시·앱)에 남으면 안 된다
  @Header('Cache-Control', 'no-store')
  createUpload(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createUploadRequestSchema)) body: CreateUploadRequest,
  ): Promise<CreateUploadResponse> {
    return this.media.createUpload(me.id, body)
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @UserThrottle({ name: 'media-complete', ...MEDIA_UPLOAD_THROTTLE })
  complete(@CurrentUser() me: AuthUser, @Param('id', new ZodValidationPipe(idSchema)) id: string): Promise<Media> {
    return this.media.complete(me.id, id)
  }
}
