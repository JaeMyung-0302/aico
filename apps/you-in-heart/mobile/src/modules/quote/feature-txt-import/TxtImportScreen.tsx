import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'
import { useMe } from '@/modules/user/data-access-me/useMe'
import MessagePickList from './MessagePickList'
import { InvalidStep, PickStep, ReadingStep } from './TxtImportSteps'
import { type ImportFile, useTxtImport } from './useTxtImport'

const FOOTER_HEIGHT = 110

type TxtImportScreenProps = {
  // 카톡에서 .txt 를 공유로 받으면(4D) 고르기 없이 바로 읽는다
  initialFile?: ImportFile | null
}

// SCR-15 카톡 txt 가져오기: expo-document-picker 로 열기 → 기기 안에서 파싱 → 다중 선택 → bulk 저장
const TxtImportScreen = ({ initialFile = null }: TxtImportScreenProps) => {
  const insets = useSafeAreaInsets()
  const me = useMe()
  const flow = useTxtImport(initialFile)
  const [query, setQuery] = useState('')
  const { state, keys, save } = flow
  const handlePick = () => {
    flow.pick().catch(() => undefined)
  }

  if (state.step !== 'select') {
    return (
      <View style={styles.screen}>
        <AppHeader />
        {state.step === 'idle' ? <PickStep onPick={handlePick} /> : null}
        {state.step === 'reading' ? <ReadingStep file={state.file} /> : null}
        {state.step === 'invalid' ? <InvalidStep onPick={handlePick} /> : null}
      </View>
    )
  }

  const count = keys.size
  const isSaving = save.mutation.isPending
  return (
    <View style={styles.screen}>
      <AppHeader
        title={`${count}개 선택`}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={flow.isAllSelected ? '선택 해제' : '모두 선택'}
            onPress={flow.toggleAll}
            style={styles.all}
          >
            <AppText variant="captionStrong" color="ink2">
              {flow.isAllSelected ? '해제' : '모두'}
            </AppText>
          </Pressable>
        }
      />
      <View style={styles.search}>
        <Icon name="search" size={16} color="ink3" />
        <TextInput
          accessibilityLabel="단어나 날짜로 찾기"
          placeholder="단어나 날짜로 찾기"
          placeholderTextColor={COLORS.ink3}
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
      </View>
      <MessagePickList
        result={state.result}
        query={query}
        myName={me.data?.displayName ?? null}
        keys={keys}
        onToggle={flow.toggle}
        bottomInset={FOOTER_HEIGHT + insets.bottom}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING[4] }]}>
        {save.mutation.isError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            {`저장하지 못했어요 (${save.progress.sent}/${save.progress.total}묶음 저장됨). 다시 누르면 이어서 저장해요`}
          </AppText>
        ) : null}
        <Button
          label={count > 0 ? `${count}개 간직하기` : '간직할 문구를 골라 주세요'}
          disabled={count === 0}
          isLoading={isSaving}
          onPress={flow.submit}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  all: { minWidth: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    marginHorizontal: SPACING[4],
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  input: { ...TYPOGRAPHY.label, flex: 1, color: COLORS.ink, padding: 0 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: SPACING[2],
    paddingTop: 14,
    paddingHorizontal: SPACING.screen,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
})

export default TxtImportScreen
