import {
  IsInt,
  IsObject,
  Min,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator'

const MAX_SAVE_SIZE = 256 * 1024

@ValidatorConstraint({ async: false })
class JsonSizeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    try {
      return JSON.stringify(value).length <= MAX_SAVE_SIZE
    } catch {
      return false
    }
  }

  defaultMessage() {
    return `Save data exceeds maximum size (${MAX_SAVE_SIZE / 1024}KB)`
  }
}

export class UpsertSaveDto {
  @IsObject()
  @Validate(JsonSizeConstraint)
  readonly data!: Record<string, unknown>

  @IsInt()
  @Min(1)
  readonly version!: number
}
