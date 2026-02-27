import { IsIn } from 'class-validator'

export class PurchaseUpgradeDto {
  @IsIn(['hp', 'atk', 'def', 'spd', 'crit'])
  statType!: 'hp' | 'atk' | 'def' | 'spd' | 'crit'
}
