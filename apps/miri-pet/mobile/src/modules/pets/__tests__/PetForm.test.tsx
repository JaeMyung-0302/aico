import { render, screen, userEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
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

  it('생일이 미래면 에러를 보여주고 제출하지 않는다', async () => {
    const { user, onSubmit } = await setup()
    await user.type(screen.getByLabelText('이름'), '보리')
    await user.type(screen.getByLabelText('생일'), '29991231')
    await user.press(primary())
    expect(screen.getByText('생일은 오늘 이후일 수 없어요')).toBeOnTheScreen()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('PetForm 수정 모드', () => {
  const PET = {
    id: '01890a5d-ac96-774b-bcce-b302099a8058',
    name: '보리',
    species: 'CAT' as const,
    breed: '코리안숏헤어',
    birthDate: '2021-05-02',
    size: 'M' as const,
    avatarUrl: 'https://r2.test/bori.jpg',
  }

  const setupEdit = async () => {
    const onSubmit = jest.fn()
    const onDirtyChange = jest.fn()
    await render(
      <PetForm
        primaryLabel="저장"
        initialPet={PET}
        onSubmit={onSubmit}
        onPickPhoto={jest.fn().mockResolvedValue(PHOTO)}
        onDirtyChange={onDirtyChange}
        footer={<Text>FOOTER</Text>}
      />,
    )
    return { onSubmit, onDirtyChange, user: userEvent.setup() }
  }

  it('저장된 값으로 채우고 아래에 footer를 둔다, 그대로 저장하면 같은 값(사진 없음)을 보낸다', async () => {
    const { user, onSubmit, onDirtyChange } = await setupEdit()
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('보리')
    expect(screen.getByLabelText('생일')).toHaveDisplayValue('2021-05-02')
    expect(screen.getByRole('button', { name: '고양이' })).toBeSelected()
    expect(screen.getByRole('button', { name: '사진 바꾸기' })).toBeOnTheScreen()
    expect(screen.getByText('FOOTER')).toBeOnTheScreen()
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)

    await user.press(screen.getByRole('button', { name: '저장' }))
    expect(onSubmit).toHaveBeenCalledWith(
      { request: { name: '보리', species: 'CAT', size: 'M', breed: '코리안숏헤어', birthDate: '2021-05-02' }, photo: null },
      'next',
    )
  })

  it('값을 바꾸면 onDirtyChange(true), 사진을 새로 고르면 그 사진을 보낸다', async () => {
    const { user, onSubmit, onDirtyChange } = await setupEdit()
    await user.type(screen.getByLabelText('품종'), '!')
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    await user.press(screen.getByRole('button', { name: '사진 바꾸기' }))
    await user.press(screen.getByRole('button', { name: '저장' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photo: PHOTO }), 'next')
  })
})

