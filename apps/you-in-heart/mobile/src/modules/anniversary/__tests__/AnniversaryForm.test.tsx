import { fireEvent, render, screen } from '@testing-library/react-native'
import AnniversaryForm from '../ui-anniversary-form/AnniversaryForm'

const fill = async ({ title, date }: { title?: string; date?: string }) => {
  if (title !== undefined) await fireEvent.changeText(screen.getByLabelText('이름'), title)
  if (date !== undefined) await fireEvent.changeText(screen.getByLabelText('날짜'), date)
}

const saveButton = () => screen.getByRole('button', { name: '저장' })

describe('AnniversaryForm', () => {
  it('추가 모드: 제목과 날짜가 모두 있어야 저장할 수 있고, 숫자 날짜를 YYYY-MM-DD 로 맞춰 보낸다', async () => {
    const onSubmit = jest.fn()
    await render(<AnniversaryForm mode="create" onSubmit={onSubmit} />)
    expect(screen.getByText('기념일 추가')).toBeOnTheScreen()
    expect(saveButton()).toBeDisabled()

    await fill({ title: '처음 만난 날' })
    expect(saveButton()).toBeDisabled()

    await fill({ date: '20250823' })
    expect(screen.getByLabelText('날짜')).toHaveDisplayValue('2025-08-23')
    expect(saveButton()).toBeEnabled()
    await fireEvent.press(saveButton())
    expect(onSubmit).toHaveBeenCalledWith({ title: '처음 만난 날', date: '2025-08-23' })
  })

  it('제목은 앞뒤 공백을 빼고 1자 이상이어야 한다 (공백만이면 저장 불가)', async () => {
    const onSubmit = jest.fn()
    await render(<AnniversaryForm mode="create" onSubmit={onSubmit} />)
    await fill({ title: '   ', date: '20250823' })
    expect(saveButton()).toBeDisabled()

    await fill({ title: '  생일  ' })
    await fireEvent.press(saveButton())
    expect(onSubmit).toHaveBeenCalledWith({ title: '생일', date: '2025-08-23' })
  })

  it('제목은 30자까지 — 31자면 안내를 보여주고 저장할 수 없다', async () => {
    await render(<AnniversaryForm mode="create" onSubmit={jest.fn()} />)
    await fill({ title: '가'.repeat(30), date: '20250823' })
    expect(saveButton()).toBeEnabled()
    expect(screen.queryByText('이름은 30자까지 쓸 수 있어요')).toBeNull()

    await fill({ title: '가'.repeat(31) })
    expect(screen.getByText('이름은 30자까지 쓸 수 있어요')).toBeOnTheScreen()
    expect(saveButton()).toBeDisabled()
  })

  it('날짜는 필수이고 달력에 없는 날짜는 저장할 수 없다', async () => {
    await render(<AnniversaryForm mode="create" onSubmit={jest.fn()} />)
    await fill({ title: '생일', date: '2025082' })
    expect(saveButton()).toBeDisabled()

    await fill({ date: '20250230' })
    expect(screen.getByText('날짜를 확인해 주세요')).toBeOnTheScreen()
    expect(saveButton()).toBeDisabled()
  })

  it('수정 모드: 기존 값으로 채워지고 삭제할 수 있다', async () => {
    const onSubmit = jest.fn()
    const onDelete = jest.fn()
    await render(
      <AnniversaryForm
        mode="edit"
        initialValue={{ title: '처음 만난 날', date: '2027-08-23' }}
        onSubmit={onSubmit}
        onDelete={onDelete}
      />,
    )
    expect(screen.getByText('기념일 수정')).toBeOnTheScreen()
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('처음 만난 날')
    expect(screen.getByLabelText('날짜')).toHaveDisplayValue('2027-08-23')

    await fireEvent.press(screen.getByRole('button', { name: '기념일 삭제' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    await fireEvent.press(saveButton())
    expect(onSubmit).toHaveBeenCalledWith({ title: '처음 만난 날', date: '2027-08-23' })
  })

  it('저장 실패 안내를 보여준다', async () => {
    await render(<AnniversaryForm mode="create" onSubmit={jest.fn()} errorMessage="저장하지 못했어요" />)
    expect(screen.getByText('저장하지 못했어요')).toBeOnTheScreen()
  })
})
