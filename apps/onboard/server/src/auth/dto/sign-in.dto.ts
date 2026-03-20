import { IsEmail, MinLength, MaxLength } from 'class-validator'

export class SignInDto {
  @IsEmail()
  email!: string

  @MinLength(8)
  @MaxLength(72)
  password!: string
}
