import {
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGameRunDto {
  @IsInt()
  @Min(0)
  @Max(200)
  wave!: number;

  @IsInt()
  @Min(0)
  @Max(999999)
  score!: number;

  @IsBoolean()
  is_clear!: boolean;

  @IsArray()
  @IsString({ each: true })
  artifacts!: string[];

  @IsInt()
  @Min(0)
  @Max(7200)
  duration_seconds!: number;
}
