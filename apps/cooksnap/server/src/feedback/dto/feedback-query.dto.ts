import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { FeedbackCategory, FeedbackStatus } from '../../generated/prisma'

export class FeedbackQueryDto {
  @IsOptional()
  @IsEnum(FeedbackCategory)
  category?: FeedbackCategory

  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20
}
