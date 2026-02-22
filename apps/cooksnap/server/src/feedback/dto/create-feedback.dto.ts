import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { FeedbackCategory } from '@prisma/client';

export class CreateFeedbackDto {
  @IsEnum(FeedbackCategory)
  category!: FeedbackCategory;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  content!: string;
}
