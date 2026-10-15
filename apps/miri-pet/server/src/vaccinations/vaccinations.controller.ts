import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common'
import {
  type CertificateConsentRequest,
  certificateConsentRequestSchema,
  type CertificateUrl,
  type CreateVaccinationRequest,
  createVaccinationRequestSchema,
  idSchema,
  type UpcomingVaccinationResponse,
  type UpdateVaccinationRequest,
  updateVaccinationRequestSchema,
  type Vaccination,
  type WithdrawCertificateConsentResponse,
} from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { VaccinationsService } from './vaccinations.service'

const idPipe = () => new ZodValidationPipe(idSchema)

@Controller()
@Authenticated()
export class VaccinationsController {
  constructor(private readonly vaccinations: VaccinationsService) {}

  @Get('pets/:petId/vaccinations')
  list(@CurrentUser() me: AuthUser, @Param('petId', idPipe()) petId: string): Promise<Vaccination[]> {
    return this.vaccinations.list(me.id, petId)
  }

  @Post('pets/:petId/vaccinations')
  create(
    @CurrentUser() me: AuthUser,
    @Param('petId', idPipe()) petId: string,
    @Body(new ZodValidationPipe(createVaccinationRequestSchema)) body: CreateVaccinationRequest,
  ): Promise<Vaccination> {
    return this.vaccinations.create(me.id, petId, body)
  }

  // 15 VaccineAdd의 "[필수] 증명서 사진 보관 동의" 체크 → 증명서 업로드 전에 호출
  @Post('vaccinations/certificate-consent')
  @HttpCode(HttpStatus.NO_CONTENT)
  agreeCertificateConsent(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(certificateConsentRequestSchema)) body: CertificateConsentRequest,
  ): Promise<void> {
    return this.vaccinations.agreeCertificateConsent(me.id, body.version)
  }

  // 동의 철회: withdrawnAt 기록 + 내 증명서 사진 전부(접종 기록에 붙은 것 포함) DB·R2 삭제. 접종 기록은 남는다.
  // 응답 { withdrawnAt, deletedCertificateCount }. 이후 증명서 업로드는 다시 동의할 때까지 403
  @Delete('vaccinations/certificate-consent')
  withdrawCertificateConsent(@CurrentUser() me: AuthUser): Promise<WithdrawCertificateConsentResponse> {
    return this.vaccinations.withdrawCertificateConsent(me.id)
  }

  // 'upcoming'이 ':id'보다 먼저 매칭되도록 위에 둔다
  @Get('vaccinations/upcoming')
  async upcoming(@CurrentUser() me: AuthUser): Promise<UpcomingVaccinationResponse> {
    return { item: await this.vaccinations.upcoming(me.id) }
  }

  @Patch('vaccinations/:id')
  update(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe()) id: string,
    @Body(new ZodValidationPipe(updateVaccinationRequestSchema)) body: UpdateVaccinationRequest,
  ): Promise<Vaccination> {
    return this.vaccinations.update(me.id, id, body)
  }

  @Delete('vaccinations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() me: AuthUser, @Param('id', idPipe()) id: string): Promise<void> {
    return this.vaccinations.remove(me.id, id)
  }

  // 60초 presigned GET URL — 프록시·앱 캐시에 남지 않게
  @Get('vaccinations/:id/certificates')
  @Header('Cache-Control', 'no-store')
  certificates(@CurrentUser() me: AuthUser, @Param('id', idPipe()) id: string): Promise<CertificateUrl[]> {
    return this.vaccinations.certificates(me.id, id)
  }
}
