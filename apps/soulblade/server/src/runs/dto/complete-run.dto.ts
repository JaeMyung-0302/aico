import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  IsIn,
} from 'class-validator'

export class CompleteRunDto {
  @IsString()
  @IsNotEmpty()
  characterId!: string

  @IsString()
  @IsIn(['Warrior', 'Archer', 'Mage', 'Paladin'])
  classType!: string

  @IsString()
  @IsIn(['serpent_forest', 'ice_cave', 'flame_castle'])
  stageId!: string

  @IsNumber()
  @Min(0)
  @Max(9999999)
  score!: number

  @IsNumber()
  @Min(0)
  survivedSeconds!: number

  @IsNumber()
  @Min(0)
  @Max(10000)
  monstersKilled!: number

  @IsBoolean()
  bossKilled!: boolean

  @IsNumber()
  @Min(1)
  @Max(100)
  maxLevel!: number

  @IsArray()
  @IsString({ each: true })
  skillsAcquired!: string[]
}
