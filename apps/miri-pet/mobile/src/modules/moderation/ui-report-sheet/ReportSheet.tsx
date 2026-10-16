import { REPORT_REASON_LABELS, REPORT_REASONS, type ReportReason } from '@miri-pet/shared'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import Icon, { type IconName } from '@/design-system/components/Icon'
import { COLORS, type ColorToken } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { ApiError } from '@/shared/api/api-error'

export type ReportTargetType = 'POST' | 'COMMENT' | 'MESSAGE' | 'USER'

export type ReportSheetProps = {
  isVisible: boolean
  onClose: () => void
  target: { type: ReportTargetType; id: string }
  // 신고·차단 대상 작성자
  author: { id: string; nickname: string }
  onSubmitReport: (reason: ReportReason) => Promise<void>
  onBlock: () => Promise<void>
  onViewProfile?: () => void
}

type Step = 'menu' | 'reasons' | 'block' | 'reported' | 'blocked'

const TARGET_NOUN: Record<ReportTargetType, string> = {
  POST: '게시물',
  COMMENT: '댓글',
  MESSAGE: '메시지',
  USER: '사용자',
}
const BLOCK_EFFECTS = [
  '서로의 게시물, 댓글, 프로필이 보이지 않아요',
  '서로 메시지를 보낼 수 없어요',
  '팔로우가 끊기고, 차단은 설정에서 풀 수 있어요',
]

const toReportErrorMessage = (error: unknown): string =>
  error instanceof ApiError && error.status === 409
    ? '이미 신고한 대상이에요'
    : '신고하지 못했어요. 잠시 후 다시 시도해 주세요'

// 디자인 18: 메뉴 → (신고 사유 → 접수 완료) | (차단 확인 → 차단 완료)
const ReportSheet = ({ isVisible, onClose, ...rest }: ReportSheetProps) => (
  <BottomSheet isVisible={isVisible} onClose={onClose}>
    {/* 닫히면 내용을 언마운트해서 다음에 열 때 메뉴 단계부터 시작한다 */}
    {isVisible ? <ReportSheetContent onClose={onClose} {...rest} /> : null}
  </BottomSheet>
)

const ReportSheetContent = ({
  onClose,
  target,
  author,
  onSubmitReport,
  onBlock,
  onViewProfile,
}: Omit<ReportSheetProps, 'isVisible'>) => {
  const [step, setStep] = useState<Step>('menu')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const noun = TARGET_NOUN[target.type]
  const title = target.type === 'USER' ? `${author.nickname} 님` : `${author.nickname} 님의 ${noun}`

  const goTo = (next: Step) => () => {
    setErrorMessage(null)
    setStep(next)
  }

  const run = async (task: () => Promise<void>, doneStep: Step, toMessage: (error: unknown) => string) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await task()
      setStep(doneStep)
    } catch (error) {
      setErrorMessage(toMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReasonPress = (reason: ReportReason) => () =>
    run(() => onSubmitReport(reason), 'reported', toReportErrorMessage)
  const handleBlockConfirmPress = () => run(onBlock, 'blocked', () => '차단하지 못했어요. 잠시 후 다시 시도해 주세요')

  if (step === 'reported' || step === 'blocked') {
    const isReported = step === 'reported'
    return (
      <View style={styles.done}>
        <View style={styles.doneBadge}>
          <Icon name="check" size={28} color="success" />
        </View>
        <AppText variant="title3" accessibilityRole="header">
          {isReported ? '접수됐어요' : '차단했어요'}
        </AppText>
        <AppText variant="callout" color="ink2" style={styles.center}>
          {isReported
            ? '운영팀이 24시간 안에 확인할게요.\n이 콘텐츠는 지금부터 보이지 않아요.'
            : '서로의 게시물, 댓글, 프로필이 보이지 않아요.'}
        </AppText>
        <Button label="확인" variant="dark" onPress={onClose} style={styles.stretch} />
      </View>
    )
  }

  if (step === 'reasons') {
    return (
      <View>
        <AppText variant="title3" accessibilityRole="header">
          신고 사유를 골라주세요
        </AppText>
        <AppText variant="callout" color="ink2" style={styles.subtitle}>
          신고한 사실은 상대에게 알려지지 않아요.
        </AppText>
        {REPORT_REASONS.map((reason) => (
          <Pressable
            key={reason}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={handleReasonPress(reason)}
            style={styles.reasonRow}
          >
            <AppText variant="body">{REPORT_REASON_LABELS[reason]}</AppText>
            <Icon name="chevronRight" size={18} color="ink3" />
          </Pressable>
        ))}
        <ErrorText message={errorMessage} />
      </View>
    )
  }

  if (step === 'block') {
    return (
      <View>
        <AppText variant="title3" accessibilityRole="header" style={styles.titleGap}>
          {`${author.nickname} 님을 차단할까요?`}
        </AppText>
        <View style={styles.effects}>
          {BLOCK_EFFECTS.map((effect) => (
            <View key={effect} style={styles.effectRow}>
              <AppText variant="callout" color="ink2" accessibilityElementsHidden importantForAccessibility="no">
                •
              </AppText>
              <AppText variant="callout" color="ink2" style={styles.flex}>
                {effect}
              </AppText>
            </View>
          ))}
        </View>
        <ErrorText message={errorMessage} />
        <Button label="차단하기" variant="danger" isLoading={isSubmitting} onPress={handleBlockConfirmPress} />
        <Button label="취소" variant="ghost" size="md" disabled={isSubmitting} onPress={goTo('menu')} />
      </View>
    )
  }

  return (
    <View>
      <AppText variant="title3" accessibilityRole="header" style={styles.titleGap}>
        {title}
      </AppText>
      <MenuRow icon="flag" label={`${noun} 신고`} tone="danger" onPress={goTo('reasons')} />
      <MenuRow icon="block" label={`${author.nickname} 님 차단`} tone="danger" onPress={goTo('block')} />
      {onViewProfile ? <MenuRow icon="user" label="프로필 보기" tone="ink" onPress={onViewProfile} /> : null}
    </View>
  )
}

const MenuRow = ({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: IconName
  label: string
  tone: ColorToken
  onPress: () => void
}) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.menuRow}>
    <Icon name={icon} size={22} color={tone} />
    <AppText variant="button" color={tone}>
      {label}
    </AppText>
  </Pressable>
)

const ErrorText = ({ message }: { message: string | null }) =>
  message ? (
    <AppText variant="callout" color="danger" accessibilityLiveRegion="polite" style={styles.error}>
      {message}
    </AppText>
  ) : null

const styles = StyleSheet.create({
  titleGap: { marginBottom: SPACING.sm },
  subtitle: { marginTop: SPACING.xs, marginBottom: SPACING.sm },
  menuRow: {
    minHeight: 56,
    paddingHorizontal: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md + 2,
  },
  reasonRow: {
    minHeight: 52,
    paddingHorizontal: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  effects: { gap: SPACING.xs, marginBottom: SPACING.lg, paddingLeft: SPACING.xs },
  effectRow: { flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1 },
  error: { marginVertical: SPACING.sm },
  done: { paddingTop: SPACING.md, paddingBottom: SPACING.sm, alignItems: 'center', gap: SPACING.sm + 2 },
  doneBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.successSoft,
  },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch', marginTop: SPACING.sm },
})

export default ReportSheet
