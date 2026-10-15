import { render, screen, userEvent } from '@testing-library/react-native'
import VaccinationForm from '../ui-vaccination-form/VaccinationForm'

const TODAY = '2026-10-15'
const PHOTO = { uri: 'file:///cert.jpg', width: 1440, height: 1080 }

const setup = async (pickResult: typeof PHOTO | null = PHOTO) => {
  const onSubmit = jest.fn()
  const onPickCertificate = jest.fn().mockResolvedValue(pickResult)
  await render(<VaccinationForm today={TODAY} onSubmit={onSubmit} onPickCertificate={onPickCertificate} />)
  return { onSubmit, onPickCertificate, user: userEvent.setup() }
}

const field = (label: string) => screen.getByLabelText(label)
const save = () => screen.getByRole('button', { name: '저장' })

const retype = async (user: ReturnType<typeof userEvent.setup>, label: string, value: string) => {
  await user.clear(field(label))
  await user.type(field(label), value)
}

describe('VaccinationForm', () => {
  it('기본값: 종합백신 · 접종일 오늘 · 다음 접종일 1년 뒤', async () => {
    await setup()
    expect(screen.getByRole('button', { name: '종합백신(DHPPL)' })).toBeSelected()
    expect(field('접종일')).toHaveDisplayValue(TODAY)
    expect(field('다음 접종일')).toHaveDisplayValue('2027-10-15')
  })

  it('다음 접종일이 접종일보다 빠르면 에러를 보여주고 저장하지 않는다', async () => {
    const { user, onSubmit } = await setup()
    await retype(user, '다음 접종일', '20261001')
    await user.press(save())

    expect(screen.getByText('다음 접종일은 접종일 이후여야 해요')).toBeOnTheScreen()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('접종일을 바꾸면(다음 접종일을 직접 고치지 않았을 때) 다음 접종일이 따라 바뀐다, 심장사상충은 1개월', async () => {
    const { user } = await setup()
    await user.press(screen.getByRole('button', { name: '심장사상충' }))
    await retype(user, '접종일', '20261001')
    expect(field('다음 접종일')).toHaveDisplayValue('2026-11-01')
  })

  it('직접 입력은 이름이 필요하다', async () => {
    const { user, onSubmit } = await setup()
    await user.press(screen.getByRole('button', { name: '직접 입력' }))
    await user.press(save())
    expect(screen.getByText('직접 입력한 접종 이름이 필요해요')).toBeOnTheScreen()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('날짜 형식이 틀리면 에러', async () => {
    const { user, onSubmit } = await setup()
    await retype(user, '접종일', '2026133')
    await user.press(save())
    expect(screen.getByText('날짜를 YYYY-MM-DD로 입력해 주세요')).toBeOnTheScreen()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('증명서를 찍었으면 보관 동의가 있어야 저장된다', async () => {
    const { user, onSubmit, onPickCertificate } = await setup()
    await user.press(screen.getByRole('button', { name: '증명서 촬영' }))
    expect(onPickCertificate).toHaveBeenCalled()
    expect(await screen.findByLabelText('증명서 사진 1')).toBeOnTheScreen()

    await user.press(save())
    expect(screen.getByText('증명서 사진 보관에 동의해 주세요')).toBeOnTheScreen()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.press(screen.getByRole('checkbox', { name: '[필수] 증명서 사진 보관 동의' }))
    await user.press(save())
    expect(onSubmit).toHaveBeenCalledWith({
      request: {
        type: 'DHPPL',
        customName: null,
        administeredOn: TODAY,
        nextDueOn: '2027-10-15',
        clinicName: null,
      },
      certificates: [PHOTO],
    })
  })

  it('증명서 없이 병원 이름과 함께 저장한다', async () => {
    const { user, onSubmit } = await setup()
    await user.type(field('병원 (선택)'), '미리동물병원')
    await user.press(save())
    expect(onSubmit).toHaveBeenCalledWith({
      request: expect.objectContaining({ clinicName: '미리동물병원', type: 'DHPPL' }),
      certificates: [],
    })
  })
})
