import { IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(2)
  @MaxLength(48)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug는 소문자, 숫자, 하이픈만 사용 가능합니다.' })
  slug!: string
}
