import {
  CERTIFICATE_CONSENT_VERSION,
  certificateConsentRequestSchema,
  createCommentRequestSchema,
  createPlaceReportRequestSchema,
  createPostRequestSchema,
  createUploadRequestSchema,
  MAX_PETS,
  MAX_PETS_PER_POST,
} from '@miri-pet/shared'

// 보안 리뷰 후속(M4·L2·L5): 서버가 ZodValidationPipe로 쓰는 공유 스키마의 계약
describe('공유 요청 스키마 계약', () => {
  it('M4: 업로드 mime은 jpeg·png·webp만 (heic·heif 거부)', () => {
    const parse = (mime: string) => createUploadRequestSchema.safeParse({ purpose: 'POST', mime, bytes: 10 }).success
    expect(['image/jpeg', 'image/png', 'image/webp'].map(parse)).toEqual([true, true, true])
    expect(['image/heic', 'image/heif', 'image/gif'].map(parse)).toEqual([false, false, false])
  })

  it('L2: 증명서 동의 version은 CERTIFICATE_CONSENT_VERSION과 같아야 한다', () => {
    expect(certificateConsentRequestSchema.safeParse({ version: CERTIFICATE_CONSENT_VERSION }).success).toBe(true)
    expect(certificateConsentRequestSchema.safeParse({ version: '1999-01-01' }).success).toBe(false)
  })

  it('L5: 장소 제보 allowedSizes는 1~3개, 중복 없이', () => {
    const report = (allowedSizes: string[]) =>
      createPlaceReportRequestSchema.safeParse({
        kind: 'NEW',
        name: '카페',
        address: '서울',
        category: 'CAFE',
        allowedSizes,
        indoorAllowed: true,
        lat: 37.5,
        lng: 127,
      }).success
    expect(report(['S', 'M', 'L'])).toBe(true)
    expect(report(['S', 'S'])).toBe(false)
    expect(report(['S', 'M', 'L', 'L'])).toBe(false)
    expect(report([])).toBe(false)
  })

  it('Phase 4 L: 게시물 petIds는 MAX_PETS_PER_POST(= MAX_PETS 5)마리까지', () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, n) => `0199e3a0-0000-7000-8000-${String(n + 1).padStart(12, '0')}`)
    const parse = (petIds: string[]) => createPostRequestSchema.safeParse({ mediaIds: ids(1), petIds }).success
    expect(MAX_PETS_PER_POST).toBe(MAX_PETS)
    expect(parse(ids(MAX_PETS))).toBe(true)
    expect(parse(ids(MAX_PETS + 1))).toBe(false)
  })

  describe('QA1 P3: 댓글·게시물 텍스트는 공백과 함께 제로폭 문자도 앞뒤에서 잘라낸다', () => {
    const comment = (body: string) => createCommentRequestSchema.safeParse({ body })

    it.each(['\u200B', ' \u200B \uFEFF ', '\u200C\u200D', '\u2060\n\t'])(
      '공백·제로폭 문자만 있는 댓글 %j는 거부한다',
      (body) => {
        expect(comment(body).success).toBe(false)
      },
    )

    it('앞뒤 제로폭 문자·공백을 잘라 저장하고, 가운데 문자(이모지 ZWJ 포함)는 그대로 둔다', () => {
      expect(comment('\u200B 안녕 \uFEFF').data).toEqual({ body: '안녕' })
      expect(comment('가족 👩\u200D👧').data).toEqual({ body: '가족 👩\u200D👧' })
    })

    it('게시물 캡션도 제로폭 문자만 있으면 빈 캡션이 된다', () => {
      const parsed = createPostRequestSchema.safeParse({
        caption: '\u200B\u2060 ',
        mediaIds: ['0199e3a0-0000-7000-8000-000000000001'],
        petIds: ['0199e3a0-0000-7000-8000-000000000002'],
      })
      expect(parsed.data?.caption).toBe('')
    })
  })
})
