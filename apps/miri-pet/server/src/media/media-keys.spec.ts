import {
  allObjectsOf,
  certificateKey,
  incomingKeyOf,
  newMediaId,
  placeReportKey,
  publicMainKey,
  publicUrlsOf,
  storedObjectsOf,
} from './media-keys'

const MEDIA_ID = '0199e3a0-0000-7000-8000-0000000000m1'
const OWNER_ID = '0199e3a0-0000-7000-8000-0000000000a1'

describe('media-keys', () => {
  it('업로드 원본 키는 incoming/{mediaId} (complete 뒤에도 같은 키를 다시 지울 수 있게 id에서 계산)', () => {
    expect(incomingKeyOf(MEDIA_ID)).toBe(`incoming/${MEDIA_ID}`)
  })

  it('새 Media id는 uuid v7(시간순, 매번 다름)', () => {
    const first = newMediaId()
    const second = newMediaId()
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(first).not.toBe(second)
    expect(first.slice(0, 13) <= second.slice(0, 13)).toBe(true)
  })

  it('allObjectsOf: PENDING 공개 이미지는 incoming + complete 중간 실패로 남았을 수 있는 1440·480까지', () => {
    expect(
      allObjectsOf({
        id: MEDIA_ID,
        ownerId: OWNER_ID,
        bucket: 'PUBLIC',
        key: incomingKeyOf(MEDIA_ID),
        status: 'PENDING',
      }),
    ).toEqual([
      { bucket: 'PRIVATE', key: `incoming/${MEDIA_ID}` },
      { bucket: 'PUBLIC', key: `p/${MEDIA_ID}/1440.jpg` },
      { bucket: 'PUBLIC', key: `p/${MEDIA_ID}/480.jpg` },
    ])
  })

  it('제보 사진 키는 private r/{ownerId}/{mediaId}.jpg', () => {
    expect(placeReportKey(OWNER_ID, MEDIA_ID)).toBe(`r/${OWNER_ID}/${MEDIA_ID}.jpg`)
  })

  it('allObjectsOf: PENDING 비공개(증명서·제보 사진)는 incoming + c/·r/ 최종 위치 둘 다(용도를 몰라도 남김없이)', () => {
    expect(
      allObjectsOf({
        id: MEDIA_ID,
        ownerId: OWNER_ID,
        bucket: 'PRIVATE',
        key: incomingKeyOf(MEDIA_ID),
        status: 'PENDING',
      }),
    ).toEqual([
      { bucket: 'PRIVATE', key: `incoming/${MEDIA_ID}` },
      { bucket: 'PRIVATE', key: `c/${OWNER_ID}/${MEDIA_ID}.jpg` },
      { bucket: 'PRIVATE', key: `r/${OWNER_ID}/${MEDIA_ID}.jpg` },
    ])
  })

  it('allObjectsOf: READY는 storedObjectsOf와 같다', () => {
    const ready = {
      id: MEDIA_ID,
      ownerId: OWNER_ID,
      bucket: 'PUBLIC' as const,
      key: publicMainKey(MEDIA_ID),
      status: 'READY' as const,
    }
    expect(allObjectsOf(ready)).toEqual(storedObjectsOf(ready))
  })

  it('PENDING·REJECTED는 incoming 원본(private) 1개', () => {
    expect(storedObjectsOf({ id: MEDIA_ID, bucket: 'PUBLIC', key: 'incoming/x', status: 'PENDING' })).toEqual([
      { bucket: 'PRIVATE', key: 'incoming/x' },
    ])
    expect(storedObjectsOf({ id: MEDIA_ID, bucket: 'PRIVATE', key: 'incoming/y', status: 'REJECTED' })).toEqual([
      { bucket: 'PRIVATE', key: 'incoming/y' },
    ])
  })

  it('공개 이미지 Media.key는 1440 원본 경로 그대로 (Phase 1 publicMediaUrl과 같은 규칙)', () => {
    expect(publicMainKey(MEDIA_ID)).toBe(`p/${MEDIA_ID}/1440.jpg`)
  })

  it('READY 공개 이미지는 1440 + 480 두 개', () => {
    expect(storedObjectsOf({ id: MEDIA_ID, bucket: 'PUBLIC', key: publicMainKey(MEDIA_ID), status: 'READY' })).toEqual([
      { bucket: 'PUBLIC', key: `p/${MEDIA_ID}/1440.jpg` },
      { bucket: 'PUBLIC', key: `p/${MEDIA_ID}/480.jpg` },
    ])
  })

  it('READY 증명서는 private c/{ownerId}/{id}.jpg 하나', () => {
    const key = certificateKey(OWNER_ID, MEDIA_ID)
    expect(key).toBe(`c/${OWNER_ID}/${MEDIA_ID}.jpg`)
    expect(storedObjectsOf({ id: MEDIA_ID, bucket: 'PRIVATE', key, status: 'READY' })).toEqual([
      { bucket: 'PRIVATE', key },
    ])
  })

  it('공개 URL은 READY 공개 이미지만', () => {
    const base = 'https://img.example.com'
    expect(
      publicUrlsOf(base, { id: MEDIA_ID, bucket: 'PUBLIC', key: publicMainKey(MEDIA_ID), status: 'READY' }),
    ).toEqual({
      url: `${base}/p/${MEDIA_ID}/1440.jpg`,
      thumbUrl: `${base}/p/${MEDIA_ID}/480.jpg`,
    })
    expect(publicUrlsOf(base, { id: MEDIA_ID, bucket: 'PRIVATE', key: 'c/x.jpg', status: 'READY' })).toEqual({
      url: null,
      thumbUrl: null,
    })
    expect(publicUrlsOf(base, { id: MEDIA_ID, bucket: 'PUBLIC', key: 'incoming/x', status: 'PENDING' })).toEqual({
      url: null,
      thumbUrl: null,
    })
  })
})
