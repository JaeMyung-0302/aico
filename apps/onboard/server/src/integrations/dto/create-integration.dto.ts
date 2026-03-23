import { IsString, IsIn, IsOptional, IsObject } from 'class-validator'

export class CreateIntegrationDto {
  @IsString()
  @IsIn(['notion', 'github'])
  type!: 'notion' | 'github'

  @IsString()
  accessToken!: string

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>
}
