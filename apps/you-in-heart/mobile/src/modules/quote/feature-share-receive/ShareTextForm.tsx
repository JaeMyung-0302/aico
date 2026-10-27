import { toKstDate } from '@you-in-heart/shared'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import TextField from '@/design-system/components/TextField'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import DiaryDateSheet from '@/modules/diary/feature-diary-compose/DiaryDateSheet'
import { useNow } from '@/shared/hooks/use-now'
import { useCreateQuote } from '../data-access-quote/useQuotes'
import { truncate } from '../util-quote/quote-batches'

type ShareTextFormProps = {
  text: string
  // [나, 상대] 표시 이름
  myName: string | null
  partnerName: string | null
  onSaved: () => void
}

const MAX_TEXT_LENGTH = 2000
const MAX_SPEAKER_LENGTH = 50
const MAX_MEMO_LENGTH = 500
const SAVE_ERROR = '저장하지 못했어요. 잠시 후 다시 시도해 주세요'

// "2026년 3월 14일"
const formatKoreanDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-')
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}

// 오늘(모르면)은 저장하는 시각, 고른 날은 그날 정오(KST)
const toSaidAt = (pickedDate: string | null, today: string): string =>
  pickedDate && pickedDate !== today ? `${pickedDate}T12:00:00+09:00` : new Date(Date.now()).toISOString()

const SpeakerSegment = ({ names, value, onChange }: { names: string[]; value: string | null; onChange: (name: string) => void }) => (
  <View style={styles.segment}>
    {names.map((name) => {
      const isOn = name === value
      return (
        <Pressable
          key={name}
          accessibilityRole="button"
          accessibilityLabel={name}
          accessibilityState={{ selected: isOn }}
          onPress={() => onChange(name)}
          style={[styles.segmentItem, isOn ? styles.segmentOn : null]}
        >
          <AppText variant={isOn ? 'labelStrong' : 'label'} color={isOn ? 'ink' : 'ink3'}>
            {name}
          </AppText>
        </Pressable>
      )
    })}
  </View>
)

// SCR-14 문구 간직하기: 미리보기(다듬기) → 누가 보냈나요 → 보낸 날(기본 오늘) → 메모 → POST /quotes(SHARE)
const ShareTextForm = ({ text, myName, partnerName, onSaved }: ShareTextFormProps) => {
  const insets = useSafeAreaInsets()
  const create = useCreateQuote()
  const today = toKstDate(useNow(60_000))
  const names = [partnerName, myName].filter((name): name is string => Boolean(name))
  const [draft, setDraft] = useState(text)
  const [isEditing, setIsEditing] = useState(false)
  const [speaker, setSpeaker] = useState<string | null>(null)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [memo, setMemo] = useState('')
  const chosenSpeaker = speaker ?? names[0] ?? null
  const trimmed = draft.trim()

  const handleSave = () => {
    const trimmedMemo = memo.trim()
    create.mutate(
      {
        source: 'SHARE',
        text: truncate(trimmed, MAX_TEXT_LENGTH),
        ...(chosenSpeaker ? { speakerLabel: truncate(chosenSpeaker, MAX_SPEAKER_LENGTH) } : {}),
        saidAt: toSaidAt(pickedDate, today),
        ...(trimmedMemo ? { memo: trimmedMemo } : {}),
      },
      { onSuccess: onSaved },
    )
  }

  return (
    <>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACING[6] }]}>
        <AppText variant="micro" color="ink3">
          카톡에서 공유 받음
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          문구 간직하기
        </AppText>
        <View style={styles.preview}>
          {isEditing ? (
            <TextField label="문구" value={draft} onChangeText={setDraft} multiline maxLength={MAX_TEXT_LENGTH} />
          ) : (
            <AppText variant="body">{draft}</AppText>
          )}
        </View>
        {isEditing ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel="문구 다듬기" onPress={() => setIsEditing(true)}>
            <AppText variant="caption" color="ink2" style={styles.underline}>
              문구 다듬기
            </AppText>
          </Pressable>
        )}
        {names.length > 0 ? (
          <View style={styles.field}>
            <AppText variant="caption" color="ink2">
              누가 보냈나요?
            </AppText>
            <SpeakerSegment names={names} value={chosenSpeaker} onChange={setSpeaker} />
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`보낸 날 ${formatKoreanDate(pickedDate ?? today)}`}
          onPress={() => setIsDateOpen(true)}
          style={styles.dateRow}
        >
          <AppText variant="caption" color="ink2">
            보낸 날
          </AppText>
          <AppText variant="bodyStrong">{formatKoreanDate(pickedDate ?? today)}</AppText>
          <AppText variant="micro" color="ink3">
            모르면 오늘로 저장
          </AppText>
        </Pressable>
        <TextField label="메모 (선택)" value={memo} onChangeText={setMemo} maxLength={MAX_MEMO_LENGTH} />
        {create.isError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            {SAVE_ERROR}
          </AppText>
        ) : null}
        <Button label="보관함에 저장" disabled={trimmed.length === 0} isLoading={create.isPending} onPress={handleSave} />
      </ScrollView>
      {isDateOpen ? (
        <DiaryDateSheet
          isVisible
          value={pickedDate ?? today}
          onClose={() => setIsDateOpen(false)}
          onConfirm={(isoDate) => {
            setPickedDate(isoDate)
            setIsDateOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING[5], paddingTop: SPACING[4], gap: SPACING[4] },
  preview: { padding: SPACING[5], borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  underline: { textDecorationLine: 'underline' },
  field: { gap: SPACING[2] },
  segment: { flexDirection: 'row', padding: 4, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  segmentItem: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm },
  segmentOn: { backgroundColor: COLORS.bg },
  dateRow: { gap: SPACING[1] },
})

export default ShareTextForm
