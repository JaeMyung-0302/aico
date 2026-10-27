import { displayNameSchema } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { type RefObject, useEffect, useRef, useState } from 'react'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { useLogout } from '@/modules/auth/data-access-auth/useLogout'
import PairingLayout from '@/modules/couple/feature-pairing/PairingLayout'
import { useMe, useUpdateMe } from '../data-access-me/useMe'

type PairingIntent = 'invite' | 'join'

const INTENT_ROUTE = { invite: '/pairing', join: '/pairing/join' } as const

const pushPendingIntent = (pendingRef: RefObject<PairingIntent | null>) => {
  const intent = pendingRef.current
  if (!intent) return
  pendingRef.current = null
  router.push(INTENT_ROUTE[intent])
}

// SCR-02 1. 표시 이름 → 초대 코드 만들기 / 받은 코드 입력하기.
// 이름을 저장하면 게이트가 페어링 화면을 열고(이 화면은 그대로 남는다), 그다음 고른 화면으로 이동한다
const ProfileScreen = () => {
  const me = useMe()
  const updateMe = useUpdateMe()
  const logout = useLogout()
  const savedName = me.data?.displayName ?? ''
  const [name, setName] = useState(savedName)
  // 이름 저장 후 게이트가 페어링을 열면 이동할 화면 (렌더와 무관한 값이라 ref)
  const pendingIntentRef = useRef<PairingIntent | null>(null)
  const isValid = displayNameSchema.safeParse(name).success
  const isPairingOpen = savedName !== '' && !me.data?.couple

  // 처음 이름을 정한 경우: 게이트가 페어링 화면을 연 뒤에 이동한다
  useEffect(() => {
    if (isPairingOpen) pushPendingIntent(pendingIntentRef)
  }, [isPairingOpen])

  const handleChoose = (next: PairingIntent) => {
    pendingIntentRef.current = next
    if (name.trim() === savedName) {
      pushPendingIntent(pendingIntentRef)
      return
    }
    // 이미 페어링 단계에서 이름만 바꾼 경우: 게이트 변화가 없으니 저장 직후 바로 이동한다
    const wasPairingOpen = isPairingOpen
    updateMe.mutate(name.trim(), {
      onSuccess: () => {
        if (wasPairingOpen) pushPendingIntent(pendingIntentRef)
      },
      onError: () => {
        pendingIntentRef.current = null
      },
    })
  }

  return (
    <PairingLayout
      hasBack={false}
      title={'상대에게 어떤 이름으로\n보일까요?'}
      subtitle="나중에 설정에서 바꿀 수 있어요."
      footer={
        <>
          <Button
            label="초대 코드 만들기"
            disabled={!isValid}
            isLoading={updateMe.isPending}
            onPress={() => handleChoose('invite')}
          />
          <Button
            label="받은 코드 입력하기"
            variant="outline"
            disabled={!isValid}
            onPress={() => handleChoose('join')}
          />
          <Button label="다른 계정으로 로그인" variant="text" size="md" onPress={() => logout.mutate()} />
        </>
      }
    >
      <TextField
        label="표시 이름"
        value={name}
        onChangeText={setName}
        maxLength={20}
        returnKeyType="done"
        errorMessage={updateMe.isError ? '저장하지 못했어요. 잠시 후 다시 시도해 주세요' : null}
      />
    </PairingLayout>
  )
}

export default ProfileScreen
