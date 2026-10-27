import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useNow } from '@/shared/hooks/use-now'
import { useAnniversaries } from '../data-access-anniversary/useAnniversaries'
import AnniversaryEditorSheets from './AnniversaryEditorSheets'
import AnniversaryList from './AnniversaryList'
import { useAnniversaryEditor } from './useAnniversaryEditor'

const MINUTE_MS = 60_000

// SCR-04 기념일. 자동 기념일(100일 단위·N주년)은 사귄 날로 정해지고, 우리가 정한 날만 추가·수정·삭제한다
// 연결 해제 유예 중에는 읽기 전용(추가 버튼·행 눌러 고치기 없음)
const AnniversariesScreen = () => {
  const insets = useSafeAreaInsets()
  const now = useNow(MINUTE_MS)
  const couple = useMe().data?.couple ?? null
  const isReadOnly = couple?.status === 'UNLINKING'
  const anniversaries = useAnniversaries({ isEnabled: couple !== null })
  const editor = useAnniversaryEditor()

  const addButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="기념일 추가"
      onPress={editor.openCreate}
      style={styles.add}
    >
      <Icon name="plus" />
    </Pressable>
  )

  return (
    <View style={styles.screen}>
      <AppHeader title="기념일" right={isReadOnly ? null : addButton} />
      {anniversaries.isError && !anniversaries.data ? (
        <EmptyLayout
          icon="alert"
          title="잠시 문제가 생겼어요"
          description={'기록은 안전하게 보관되어 있어요.\n잠시 뒤 다시 시도해 주세요.'}
          onRetry={() => anniversaries.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACING[8] }]}>
          {anniversaries.data ? (
            <AnniversaryList
              items={anniversaries.data}
              nowMs={now}
              hasStartedOn={Boolean(couple?.startedOn)}
              onEditCustom={isReadOnly ? undefined : editor.openEdit}
            />
          ) : null}
        </ScrollView>
      )}
      <AnniversaryEditorSheets editor={editor} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingHorizontal: SPACING.screen },
  add: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
})

export default AnniversariesScreen
