import { useState } from 'react'
import { StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'

type WithdrawDialogProps = {
  isVisible: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  errorMessage: string | null
}

type Step = 'notice' | 'confirm'

const NOTICE =
  '반려동물 프로필, 접종 기록과 증명서 사진, 게시물, 댓글, 대화가 모두 지워지고 되돌릴 수 없어요. 연결된 카카오 · Google 계정 연동도 해제돼요.'

// 회원 탈퇴 2단계 확인: 안내(다음) → 최종 확인(탈퇴하기)
const WithdrawDialog = ({ isVisible, ...rest }: WithdrawDialogProps) =>
  // 닫히면 언마운트해서 다음에 열 때 1단계부터 시작한다
  isVisible ? <WithdrawDialogContent {...rest} /> : null

const WithdrawDialogContent = ({
  onClose,
  onConfirm,
  isSubmitting,
  errorMessage,
}: Omit<WithdrawDialogProps, 'isVisible'>) => {
  const [step, setStep] = useState<Step>('notice')
  const isNotice = step === 'notice'
  const cancelButton = (
    <Button
      label="취소"
      variant="secondary"
      size="md"
      disabled={isSubmitting}
      onPress={onClose}
      style={styles.action}
    />
  )

  return (
    <Dialog
      isVisible
      onClose={isSubmitting ? () => undefined : onClose}
      title={isNotice ? '탈퇴하기 전에 확인해 주세요' : '정말 탈퇴할까요?'}
      description={isNotice ? NOTICE : '탈퇴하면 같은 계정으로 다시 가입해도 기존 기록을 되살릴 수 없어요.'}
      actions={
        isNotice ? (
          <>
            {cancelButton}
            <Button label="다음" variant="dark" size="md" onPress={() => setStep('confirm')} style={styles.action} />
          </>
        ) : (
          <>
            {cancelButton}
            <Button
              label="탈퇴하기"
              variant="danger"
              size="md"
              isLoading={isSubmitting}
              onPress={onConfirm}
              style={styles.action}
            />
          </>
        )
      }
    >
      {errorMessage && !isNotice ? (
        <AppText variant="callout" color="danger" accessibilityLiveRegion="polite">
          {errorMessage}
        </AppText>
      ) : null}
    </Dialog>
  )
}

const styles = StyleSheet.create({
  action: { flex: 1 },
})

export default WithdrawDialog
