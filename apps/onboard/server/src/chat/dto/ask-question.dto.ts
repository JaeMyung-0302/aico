import { IsString, MinLength, MaxLength } from 'class-validator'

export class AskQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  query!: string
}
