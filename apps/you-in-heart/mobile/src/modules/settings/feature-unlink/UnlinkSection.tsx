import type { Couple } from '@you-in-heart/shared'
import { useState } from 'react'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'
import ListRow from '@/design-system/components/ListRow'
import { useReconnectCouple, useUnlinkCouple } from '@/modules/couple/data-access-couple/useCouple'
import { findPartnerName } from '@/modules/couple/util-pairing/partner-name'
import UnlinkConfirmModal from './UnlinkConfirmModal'
import UnlinkStatus from './UnlinkStatus'

type UnlinkSectionProps = {
  couple: Couple
  myUserId: string
}

type Step = 'idle' | 'first' | 'second'

// SCR-16 연결 해제(2단계 확인) · 유예 중 다시 연결. 해제 요청은 2단계 버튼에서만 보낸다
const UnlinkSection = ({ couple, myUserId }: UnlinkSectionProps) => {
  const [step, setStep] = useState<Step>('idle')
  const unlink = useUnlinkCouple()
  const reconnect = useReconnectCouple()

  if (couple.status === 'UNLINKING') {
    return (
      <UnlinkStatus
        couple={couple}
        myUserId={myUserId}
        isReconnecting={reconnect.isPending}
        onReconnect={() => reconnect.mutate()}
      />
    )
  }

  const close = () => {
    setStep('idle')
    unlink.reset()
  }

  return (
    <>
      <ListRow title="커플 연결 해제" titleColor="danger" trailing={null} onPress={() => setStep('first')} />
      <Dialog
        isVisible={step === 'first'}
        onClose={close}
        title="커플 연결을 해제할까요?"
        description="다음 단계에서 해제하면 어떤 일이 일어나는지 확인할 수 있어요."
        actions={
          <>
            <Button label="취소" variant="outline" size="md" onPress={close} style={{ flex: 1 }} />
            <Button label="계속" variant="danger" size="md" onPress={() => setStep('second')} style={{ flex: 1 }} />
          </>
        }
      />
      <UnlinkConfirmModal
        isVisible={step === 'second'}
        partnerName={findPartnerName(couple, myUserId)}
        isSubmitting={unlink.isPending}
        errorMessage={unlink.isError ? '해제하지 못했어요. 잠시 후 다시 시도해 주세요' : null}
        onClose={close}
        onConfirm={() => unlink.mutate(undefined, { onSuccess: () => setStep('idle') })}
      />
    </>
  )
}

export default UnlinkSection
