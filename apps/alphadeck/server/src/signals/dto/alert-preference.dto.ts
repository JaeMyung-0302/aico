import { IsBoolean } from 'class-validator';

export class AlertPreferenceDto {
  @IsBoolean()
  enabled!: boolean;

  @IsBoolean()
  emailEnabled!: boolean;

  @IsBoolean()
  pushEnabled!: boolean;
}
