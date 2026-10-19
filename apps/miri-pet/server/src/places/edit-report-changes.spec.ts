import type { Place } from '../generated/prisma'
import { hasEditChanges } from './edit-report-changes'

const PLACE: Pick<Place, 'name' | 'address' | 'category' | 'allowedSizes' | 'indoorAllowed' | 'conditionsNote'> = {
  name: '테스트 카페',
  address: '서울 성동구 성수동',
  category: 'CAFE',
  allowedSizes: ['S', 'M'],
  indoorAllowed: false,
  conditionsNote: null,
}

// QA1 P3: 아무것도 바꾸지 않는 EDIT 제보는 받지 않는다
describe('hasEditChanges', () => {
  it('필드·메모·사진이 하나도 없으면 false', () => {
    expect(hasEditChanges({}, PLACE)).toBe(false)
    expect(hasEditChanges({ note: '' }, PLACE)).toBe(false)
  })

  it('보낸 필드가 모두 현재 값과 같으면 false (크기는 순서 무관, 빈 조건 메모 = null)', () => {
    expect(
      hasEditChanges(
        {
          name: '테스트 카페',
          address: '서울 성동구 성수동',
          category: 'CAFE',
          allowedSizes: ['M', 'S'],
          indoorAllowed: false,
          conditionsNote: '',
        },
        PLACE,
      ),
    ).toBe(false)
  })

  it.each([
    ['이름', { name: '새 이름' }],
    ['주소', { address: '서울 강남구' }],
    ['분류', { category: 'PARK' as const }],
    ['크기', { allowedSizes: ['S' as const] }],
    ['실내', { indoorAllowed: true }],
    ['조건 메모', { conditionsNote: '목줄 필수' }],
    ['제보 메모', { note: '주차 가능' }],
  ])('%s이(가) 다르거나 메모가 있으면 true', (_label, edit) => {
    expect(hasEditChanges(edit, PLACE)).toBe(true)
  })
})
