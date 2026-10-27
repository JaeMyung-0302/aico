import { INVITE_CODE_LENGTH } from '@you-in-heart/shared'
import { StyleSheet, TextInput, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

type CodeCellsProps = {
  code: string
  hasError?: boolean
  // 있으면 입력 가능(보이지 않는 입력칸이 칸 위에 겹친다). 없으면 보여주기만
  onChangeCode?: (next: string) => void
}

const CELL_INDEXES = Array.from({ length: INVITE_CODE_LENGTH }, (_, index) => index)

// SCR-02 6칸 코드 (60px, surface, 고정폭 24 bold). 오류면 danger 테두리
const CodeCells = ({ code, hasError = false, onChangeCode }: CodeCellsProps) => (
  <View style={styles.row}>
    {CELL_INDEXES.map((index) => (
      <View key={index} style={[styles.cell, hasError && styles.cellError]}>
        <AppText style={styles.char}>{code[index] ?? ''}</AppText>
      </View>
    ))}
    {onChangeCode ? (
      <TextInput
        accessibilityLabel="초대 코드"
        value={code}
        onChangeText={onChangeCode}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        maxLength={INVITE_CODE_LENGTH}
        caretHidden
        style={styles.overlay}
      />
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING[2] },
  cell: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  cellError: { borderWidth: 1.5, borderColor: COLORS.danger },
  char: { fontFamily: 'Menlo', fontSize: 24, lineHeight: 30, fontWeight: '700' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
})

export default CodeCells
