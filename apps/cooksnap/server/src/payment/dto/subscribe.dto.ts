import { IsString, IsNotEmpty } from 'class-validator'

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  billingKey!: string
}
