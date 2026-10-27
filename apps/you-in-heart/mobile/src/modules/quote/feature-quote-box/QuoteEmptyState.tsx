import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon, { type IconName } from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'

type WayProps = { icon: IconName; title: string; description: string; onPress?: () => void }

const Way = ({ icon, title, description, onPress }: WayProps) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : 'text'}
    accessibilityLabel={`${title} ${description}`}
    disabled={!onPress}
    onPress={onPress}
    style={styles.way}
  >
    <View style={styles.wayIcon}>
      <Icon name={icon} size={20} color="accent" />
    </View>
    <View style={styles.wayTexts}>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="micro" color="ink2" style={styles.small}>
        {description}
      </AppText>
    </View>
  </Pressable>
)

// "카톡에서 공유하기"는 이 앱에서 시작할 수 없어 안내만 한다(카톡 메시지를 길게 눌러 공유)
export const AddWays = ({ onImport, onScreenshot }: { onImport: () => void; onScreenshot: () => void }) => (
  <View style={styles.ways}>
    <Way icon="share" title="카톡에서 공유하기" description="메시지를 길게 눌러 공유 → You-In-Heart" />
    <Way icon="file" title="대화 내보내기 파일 가져오기" description="채팅방 설정 → 대화 내용 내보내기 (.txt)" onPress={onImport} />
    <Way icon="image" title="스크린샷 저장" description="캡처한 이미지를 그대로 보관해요" onPress={onScreenshot} />
  </View>
)

// SCR-13 빈 보관함: 추가하는 3가지 방법
const QuoteEmptyState = ({ onImport, onScreenshot }: { onImport: () => void; onScreenshot: () => void }) => (
  <View style={styles.wrap}>
    <View style={styles.intro}>
      <AppText variant="title" style={styles.heading} accessibilityRole="header">
        {'카톡 속 예쁜 말들,\n여기에 간직해요'}
      </AppText>
      <AppText variant="label" color="ink2">
        흘러가 버리기 아까운 문구를 모아두면 홈 화면에서 하나씩 다시 보여드려요.
      </AppText>
    </View>
    <AddWays onImport={onImport} onScreenshot={onScreenshot} />
    <AppText variant="micro" color="ink3" style={styles.small}>
      txt 파일은 기기 안에서만 읽고, 고른 문구만 저장돼요. 대화 전체는 서버에 올라가지 않아요.
    </AppText>
  </View>
)

const styles = StyleSheet.create({
  wrap: { gap: SPACING[6] },
  intro: { gap: SPACING[2] },
  heading: { fontSize: 24, lineHeight: 34 },
  ways: { gap: 10 },
  way: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: SPACING[4],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  wayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blush,
  },
  wayTexts: { flex: 1, gap: 2 },
  small: { fontSize: 12, lineHeight: 19 },
})

export default QuoteEmptyState
