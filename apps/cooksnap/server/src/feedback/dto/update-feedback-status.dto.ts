import { IsEnum } from 'class-validator'
import { FeedbackStatus } from '../../generated/prisma'

export class UpdateFeedbackStatusDto {
  @IsEnum(FeedbackStatus)
  status!: FeedbackStatus
}
