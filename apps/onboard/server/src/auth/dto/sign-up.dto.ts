import { IsEmail, MinLength, MaxLength, IsOptional, IsString } from 'class-validator'

export class SignUpDto {
  @IsEmail()
  email!: string

  @MinLength(8)
  @MaxLength(72)
  password!: string

  @IsOptional()
  @IsString()
  name?: string
}
