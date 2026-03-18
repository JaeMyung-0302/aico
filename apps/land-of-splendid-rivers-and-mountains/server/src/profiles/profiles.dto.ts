import { IsString, MinLength, MaxLength } from 'class-validator'

export class CreateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  readonly name!: string
}
