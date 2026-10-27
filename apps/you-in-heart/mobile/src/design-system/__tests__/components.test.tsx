import { render, screen, userEvent } from '@testing-library/react-native'
import Button from '../components/Button'
import EmptyLayout from '../components/EmptyLayout'
import ListRow from '../components/ListRow'
import Toast from '../components/Toast'
import Toggle from '../components/Toggle'

describe('EmptyLayout (SCR-18)', () => {
  it('onRetry가 있으면 "다시 시도" 버튼을 보여주고 누르면 부른다', async () => {
    const onRetry = jest.fn()
    const user = userEvent.setup()
    await render(<EmptyLayout icon="alert" title="잠시 문제가 생겼어요" onRetry={onRetry} footnote="오류 코드 500" />)
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('오류 코드 500')).toBeOnTheScreen()
  })

  it('빈 상태는 버튼 없이 제목·설명만, action 이 있으면 그 버튼을 보여준다', async () => {
    const onPress = jest.fn()
    await render(
      <EmptyLayout title="찾을 수 없는 기록이에요" description="설명" action={{ label: '타임라인으로', onPress }} />,
    )
    expect(screen.getByText('설명')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull()
    await userEvent.setup().press(screen.getByRole('button', { name: '타임라인으로' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('Button', () => {
  it('비활성·로딩이면 누를 수 없다', async () => {
    const onPress = jest.fn()
    const user = userEvent.setup()
    await render(<Button label="연결하기" disabled onPress={onPress} />)
    await user.press(screen.getByRole('button', { name: '연결하기' }))
    expect(onPress).not.toHaveBeenCalled()

    await render(<Button label="저장" isLoading onPress={onPress} />)
    expect(screen.getByRole('button', { name: '저장' })).toBeBusy()
  })
})

describe('ListRow', () => {
  it('값을 함께 읽고, 누를 수 있으면 button 이다', async () => {
    const onPress = jest.fn()
    await render(<ListRow title="사귄 날" value="2025. 09. 10" onPress={onPress} />)
    await userEvent.setup().press(screen.getByRole('button', { name: '사귄 날 2025. 09. 10' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('onPress 가 없으면 버튼이 아니다', async () => {
    await render(<ListRow title="내 표시 이름" value="재명" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Toggle', () => {
  it('switch 로 읽히고 누르면 반대 값을 알린다', async () => {
    const onChange = jest.fn()
    await render(<Toggle label="기념일 알림" isOn onChange={onChange} />)
    const toggle = screen.getByRole('switch', { name: '기념일 알림' })
    expect(toggle).toBeChecked()
    await userEvent.setup().press(toggle)
    expect(onChange).toHaveBeenCalledWith(false)
  })
})

describe('Toast', () => {
  it('메시지가 없으면 그리지 않는다', async () => {
    await render(<Toast message={null} />)
    expect(screen.toJSON()).toBeNull()
    await render(<Toast message="복사했어요" />)
    expect(screen.getByText('복사했어요')).toBeOnTheScreen()
  })
})
