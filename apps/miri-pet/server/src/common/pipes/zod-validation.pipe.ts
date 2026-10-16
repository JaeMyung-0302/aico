import { BadRequestException, type ArgumentMetadata, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

// 공유 패키지(@miri-pet/shared)의 zod 스키마로 요청 값을 검증한다
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown, metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value)
    if (result.success) return result.data
    throw new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      in: metadata.type,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    })
  }
}
