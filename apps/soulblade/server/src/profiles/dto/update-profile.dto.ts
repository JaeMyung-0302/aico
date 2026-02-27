import { IsString, MinLength, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  displayName!: string
}
