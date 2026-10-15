import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Checkbox from '@/design-system/components/Checkbox'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import type { LegalDocument } from '@/shared/config/legal-urls'
import {
  hasAllRequiredConsents,
  isConsentItemRequired,
  type ConsentFormValues,
  type ConsentItemKey,
} from '../util-consent/build-consent-request'

type ConsentItemSource = { key: ConsentItemKey; title: string; document?: LegalDocument }

// 디자인 02 순서 그대로. [필수]/[선택]은 shared REQUIRED_CONSENT_KINDS로 정한다
// TODO(server): 커뮤니티 이용 수칙 문서(/legal/community)가 생기면 보기 링크를 단다
const CONSENT_ITEM_SOURCES: readonly ConsentItemSource[] = [
  { key: 'isAge14OrOlder', title: '만 14세 이상입니다' },
  { key: 'terms', title: '서비스 이용약관', document: 'terms' },
  { key: 'privacy', title: '개인정보 수집·이용', document: 'privacy' },
  { key: 'community', title: '커뮤니티 이용 수칙' },
  { key: 'location', title: '위치기반서비스 이용약관', document: 'location' },
  { key: 'marketing', title: '이벤트·혜택 알림 수신' },
]

const CONSENT_ITEMS = CONSENT_ITEM_SOURCES.map((item) => ({
  ...item,
  label: `${isConsentItemRequired(item.key) ? '[필수]' : '[선택]'} ${item.title}`,
}))

const EMPTY_VALUES: ConsentFormValues = {
  isAge14OrOlder: false,
  terms: false,
  privacy: false,
  community: false,
  location: false,
  marketing: false,
}
const FULL_VALUES: ConsentFormValues = {
  isAge14OrOlder: true,
  terms: true,
  privacy: true,
  community: true,
  location: true,
  marketing: true,
}

type ConsentFormProps = {
  onSubmit: (values: ConsentFormValues) => void
  onOpenDocument: (document: LegalDocument) => void
  isSubmitting?: boolean
}

const ConsentForm = ({ onSubmit, onOpenDocument, isSubmitting = false }: ConsentFormProps) => {
  const [values, setValues] = useState<ConsentFormValues>(EMPTY_VALUES)
  const isAllChecked = CONSENT_ITEMS.every((item) => values[item.key])
  const canSubmit = hasAllRequiredConsents(values)

  const handleAllToggle = () => setValues(isAllChecked ? EMPTY_VALUES : FULL_VALUES)
  const handleItemToggle = (key: ConsentItemKey) => () => setValues((prev) => ({ ...prev, [key]: !prev[key] }))
  const handleSubmitPress = () => onSubmit(values)

  return (
    <View style={styles.wrap}>
      <View style={styles.form}>
        <View style={styles.allRow}>
          <Checkbox label="전체 동의" variant="emphasis" isChecked={isAllChecked} onToggle={handleAllToggle} />
        </View>
        <View style={styles.items}>
          {CONSENT_ITEMS.map((item) => (
            <View key={item.key} style={styles.itemRow}>
              <Checkbox label={item.label} isChecked={values[item.key]} onToggle={handleItemToggle(item.key)} />
              {item.document ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${item.title} 보기`}
                  hitSlop={SPACING.sm}
                  onPress={() => item.document && onOpenDocument(item.document)}
                >
                  <AppText variant="callout" color="ink2">
                    보기
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.notice}>
          <AppText variant="callout" color="onPrimarySoft">
            접종증명서 사진은 업로드할 때 별도로 동의를 받고, 나만 볼 수 있는 곳에 보관해요.
          </AppText>
        </View>
      </View>
      <Button label="동의하고 계속" disabled={!canSubmit} isLoading={isSubmitting} onPress={handleSubmitPress} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between' },
  form: { gap: SPACING.xs },
  allRow: {
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.ground,
    flexDirection: 'row',
  },
  items: { paddingVertical: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.md },
  notice: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
  },
})

export default ConsentForm
