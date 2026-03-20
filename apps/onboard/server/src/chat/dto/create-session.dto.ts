import { IsString, IsOptional } from 'class-validator'

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string
}
