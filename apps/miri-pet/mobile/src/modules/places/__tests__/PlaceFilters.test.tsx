import { render, screen, userEvent } from '@testing-library/react-native'
import { useState } from 'react'
import PlaceFilters from '../ui-place-filters/PlaceFilters'
import { EMPTY_PLACE_FILTERS, type PlaceFilterValue } from '../util-place-query'
import { buildPlaceQueryParams } from '../util-place-query'
import { SEONGSU_BBOX } from '../__fixtures__/places'

// 칩을 누를 때마다 상위 상태와 그로부터 만든 쿼리 파라미터를 기록한다
const Harness = ({ onParams }: { onParams: (params: Record<string, string | number>) => void }) => {
  const [value, setValue] = useState<PlaceFilterValue>(EMPTY_PLACE_FILTERS)
  return (
    <PlaceFilters
      value={value}
      onChange={(next) => {
        setValue(next)
        onParams(buildPlaceQueryParams(SEONGSU_BBOX, next))
      }}
    />
  )
}

const chip = (name: string) => screen.getByRole('button', { name })

describe('PlaceFilters', () => {
  it('업종·크기·실내 칩을 보여준다', async () => {
    await render(<Harness onParams={jest.fn()} />)
    ;['카페', '음식점', '공원', '숙소', '동물병원', '소형견', '중형견', '대형견', '실내 동반'].forEach((label) =>
      expect(chip(label)).toBeOnTheScreen(),
    )
  })

  it('칩 선택 → 쿼리 파라미터에 반영되고, 같은 칩을 다시 누르면 해제된다', async () => {
    const onParams = jest.fn()
    const user = userEvent.setup()
    await render(<Harness onParams={onParams} />)

    await user.press(chip('음식점'))
    expect(onParams).toHaveBeenLastCalledWith({ ...SEONGSU_BBOX, category: 'RESTAURANT' })
    expect(chip('음식점')).toBeSelected()

    await user.press(chip('대형견'))
    await user.press(chip('실내 동반'))
    expect(onParams).toHaveBeenLastCalledWith({ ...SEONGSU_BBOX, category: 'RESTAURANT', size: 'L', indoor: 'true' })

    // 업종은 하나만: 카페를 고르면 음식점이 풀린다
    await user.press(chip('카페'))
    expect(chip('음식점')).not.toBeSelected()
    expect(onParams).toHaveBeenLastCalledWith({ ...SEONGSU_BBOX, category: 'CAFE', size: 'L', indoor: 'true' })

    await user.press(chip('카페'))
    await user.press(chip('대형견'))
    await user.press(chip('실내 동반'))
    expect(onParams).toHaveBeenLastCalledWith({ ...SEONGSU_BBOX })
  })

  it('buildPlaceQueryParams: sort를 넘기면 포함한다', () => {
    expect(buildPlaceQueryParams(SEONGSU_BBOX, EMPTY_PLACE_FILTERS, 'distance')).toEqual({
      ...SEONGSU_BBOX,
      sort: 'distance',
    })
  })
})
