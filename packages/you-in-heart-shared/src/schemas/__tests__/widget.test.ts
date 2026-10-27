import { WidgetSnapshotV1 } from '../widget'

const valid = { v: 1, startedOn: '2024-03-01', names: ['나', '너'], next: { title: '100일', date: '2024-06-08' } }

describe('WidgetSnapshotV1', () => {
  it('정상 스냅샷을 통과시킨다', () => {
    expect(WidgetSnapshotV1.parse(valid)).toEqual(valid)
    expect(WidgetSnapshotV1.parse({ ...valid, next: null }).next).toBeNull()
  })

  it.each(['token', 'accessToken', 'photoUrl', 'body', 'lat', 'lng'])('추가 키 "%s"는 거부(strict)', (key) => {
    expect(WidgetSnapshotV1.safeParse({ ...valid, [key]: 'x' }).success).toBe(false)
  })

  it('next 안의 추가 키도 거부', () => {
    expect(WidgetSnapshotV1.safeParse({ ...valid, next: { ...valid.next, body: '본문' } }).success).toBe(false)
  })

  it('버전 2, 이름 1개·3개, 잘못된 날짜는 거부', () => {
    expect(WidgetSnapshotV1.safeParse({ ...valid, v: 2 }).success).toBe(false)
    expect(WidgetSnapshotV1.safeParse({ ...valid, names: ['나'] }).success).toBe(false)
    expect(WidgetSnapshotV1.safeParse({ ...valid, names: ['나', '너', '그'] }).success).toBe(false)
    expect(WidgetSnapshotV1.safeParse({ ...valid, startedOn: '2024-02-30' }).success).toBe(false)
  })
})
