import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from './zod-validation.pipe'

const schema = z.object({
  name: z.string().min(1),
  pet: z.object({ size: z.enum(['S', 'M', 'L']) }),
})

const meta = { type: 'body' as const }

const captureError = (fn: () => unknown): unknown => {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('예외가 발생하지 않았습니다')
}

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema)

  it('유효한 body는 파싱된 값을 돌려준다', () => {
    const result = pipe.transform({ name: '보리', pet: { size: 'S' }, extra: 1 }, meta)
    expect(result).toEqual({ name: '보리', pet: { size: 'S' } })
  })

  it('잘못된 body는 400 BadRequestException을 던진다', () => {
    const error = captureError(() => pipe.transform({ name: '', pet: { size: 'X' } }, meta))
    expect(error).toBeInstanceOf(BadRequestException)
    expect((error as BadRequestException).getStatus()).toBe(400)
  })

  it('응답 본문에 필드 경로별 issue를 담는다', () => {
    const error = captureError(() => pipe.transform({ name: '', pet: { size: 'X' } }, meta))
    const body = (error as BadRequestException).getResponse()
    expect(body).toMatchObject({
      statusCode: 400,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: 'name' }),
        expect.objectContaining({ path: 'pet.size' }),
      ]),
    })
  })

  it('body가 null이면 루트 경로 issue로 400을 던진다', () => {
    const error = captureError(() => pipe.transform(null, meta))
    expect(error).toBeInstanceOf(BadRequestException)
  })
})
