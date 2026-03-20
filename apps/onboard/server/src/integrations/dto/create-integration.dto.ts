import { IsString, IsIn, IsOptional } from 'class-validator'

export class CreateIntegrationDto {
  @IsString()
  @IsIn(['notion', 'github'])
  type!: 'notion' | 'github'

  @IsString()
  accessToken!: string

  @IsOptional()
  config?: Record<string, unknown>
}
