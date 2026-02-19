import { IsInt, Max, Min } from 'class-validator';

export class SubmitLeaderboardDto {
  @IsInt()
  @Min(0)
  @Max(999999)
  score!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  wave!: number;
}
