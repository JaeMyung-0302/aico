import { render, screen, userEvent } from '@testing-library/react-native'
import PetForm from '../ui-pet-form/PetForm'

const PHOTO = { uri: 'file:///bori.jpg', width: 1440, height: 1440 }

const setup = async ({ hasSecondary = true } = {}) => {
  const onSubmit = jest.fn()
  const onPickPhoto = jest.fn().mockResolvedValue(PHOTO)
  await render(
    <PetForm
      primaryLabel="완료하고 접종 기록 추가하기"
      secondaryLabel={hasSecondary ? '접종 기록은 나중에 할게요' : undefined}
      onSubmit={onSubmit}
      onPickPhoto={onPickPhoto}
    />,
  )
  return { onSubmit, onPickPhoto, user: userEvent.setup() }
}

const primary = () => screen.getByRole('button', { name: '완료하고 접종 기록 추가하기' })

describe('PetForm', () => {
  it('기본 선택: 강아지 · 소형', async () => {
    await setup()
    expect(screen.getByRole('button', { name: '강아지' })).toBeSelected()
    expect(screen.getByRole('button', { name: '소형 ~10kg' })).toBeSelected()
  })

  it('이름이 비어 있으면 에러를 보여주고 제출하지 않는다', async () => {
    const { user, onSubmit } = await setup()
    await user.type(screen.getByLabelText('이름'), '   ')
    await user.press(primary())
    expect(screen.getByText('이름을 입력해 주세요')).toBeOnTheScreen()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('생일 형식이 틀리면 에러', async () => {
    const { user, onSubmit } = await setup()
    await user.type(screen.getByLabelText('이름'), '보리')
    await user.type(screen.getByLabelText('생일'), '20211')
    await user.press(primary())
    expect(screen.getByText('날짜를 YYYY-MM-DD로 입력해 주세요')).toBeOnTheScreen()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('입력값과 사진, 누른 버튼(next/later)을 넘긴다', async () => {
    const { user, onSubmit, onPickPhoto } = await setup()
    await user.press(screen.getByRole('button', { name: '사진 추가' }))
    expect(onPickPhoto).toHaveBeenCalled()
    await user.type(screen.getByLabelText('이름'), ' 보리 ')
    await user.press(screen.getByRole('button', { name: '고양이' }))
    await user.press(screen.getByRole('button', { name: '중형 10~25kg' }))
    await user.type(screen.getByLabelText('품종'), '코리안숏헤어')
    await user.type(screen.getByLabelText('생일'), '20210502')
    await user.press(screen.getByRole('button', { name: '접종 기록은 나중에 할게요' }))

    expect(onSubmit).toHaveBeenCalledWith(
      {
        request: { name: '보리', species: 'CAT', size: 'M', breed: '코리안숏헤어', birthDate: '2021-05-02' },
        photo: PHOTO,
      },
      'later',
    )
  })

  it('선택 항목을 비우면 null로 보내고 기본 버튼은 next', async () => {
    const { user, onSubmit } = await setup({ hasSecondary: false })
    await user.type(screen.getByLabelText('이름'), '두부')
    await user.press(primary())
    expect(onSubmit).toHaveBeenCalledWith(
      { request: { name: '두부', species: 'DOG', size: 'S', breed: null, birthDate: null }, photo: null },
      'next',
    )
    expect(screen.queryByRole('button', { name: '접종 기록은 나중에 할게요' })).toBeNull()
  })
})
