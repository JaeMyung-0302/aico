import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import type { ImportFile } from './useTxtImport'

const PRIVACY_NOTE = '대화 전체는 이 휴대폰 안에서만 읽어요. 고른 문구만 저장되고, 파일은 저장하지 않아요.'

const formatSize = (bytes: number | null): string =>
  bytes === null ? '' : bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`

// 시작: 파일 고르기 안내
export const PickStep = ({ onPick }: { onPick: () => void }) => (
  <View style={styles.center}>
    <AppText variant="title" accessibilityRole="header">
      대화 내보내기 파일 가져오기
    </AppText>
    <AppText variant="label" color="ink2">
      카톡 채팅방 설정 → 대화 내용 내보내기로 만든 .txt 파일을 골라 주세요.
    </AppText>
    <Button label=".txt 파일 고르기" onPress={onPick} />
    <AppText variant="micro" color="ink3" style={styles.note}>
      {PRIVACY_NOTE}
    </AppText>
  </View>
)

// SCR-15 1. 파일 읽는 중 (기기 안에서)
export const ReadingStep = ({ file }: { file: ImportFile }) => (
  <View style={styles.center}>
    <View style={styles.file}>
      <View style={styles.fileIcon}>
        <Icon name="file" color="ink2" />
      </View>
      <View style={styles.fileTexts}>
        <AppText variant="labelStrong" numberOfLines={1}>
          {file.name}
        </AppText>
        <AppText variant="micro" color="ink3">
          {formatSize(file.size)}
        </AppText>
      </View>
    </View>
    <AppText variant="title" accessibilityRole="header">
      대화를 읽고 있어요
    </AppText>
    <View style={styles.track}>
      <View style={styles.fill} />
    </View>
    <AppText variant="micro" color="ink3" style={styles.note}>
      {PRIVACY_NOTE}
    </AppText>
  </View>
)

// SCR-15 지원하지 않는 형식·빈 파일
export const InvalidStep = ({ onPick }: { onPick: () => void }) => (
  <View accessibilityRole="alert" style={styles.invalid}>
    <Icon name="alert" size={28} color="ink2" />
    <AppText variant="bodyStrong">카톡 대화 파일이 아니에요</AppText>
    <AppText variant="caption" color="ink2" style={styles.centerText}>
      {"채팅방 설정의 '대화 내용 내보내기'로 만든\n.txt 파일을 골라 주세요. 빈 파일도 읽을 수 없어요."}
    </AppText>
    <Button label="다른 파일 고르기" variant="outline" size="md" onPress={onPick} />
  </View>
)

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: SPACING[6], paddingHorizontal: SPACING[8], paddingBottom: 140 },
  note: { fontSize: 12, lineHeight: 19 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACING[4], borderRadius: 14, backgroundColor: COLORS.surface },
  fileIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  fileTexts: { flex: 1, gap: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  // 파싱은 한 번에 끝나서 진행률을 셀 수 없다 → 진행 중 표시만
  fill: { width: '60%', height: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.accent },
  invalid: { alignItems: 'center', gap: 10, paddingVertical: SPACING[6], paddingHorizontal: SPACING[6] },
  centerText: { textAlign: 'center' },
})
