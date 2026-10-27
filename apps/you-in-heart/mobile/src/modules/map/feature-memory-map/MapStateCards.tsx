import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SHADOW } from '@/design-system/tokens/shadow'
import { SPACING } from '@/design-system/tokens/spacing'

type CardProps = { title: string; description: string; children?: ReactNode }

const Card = ({ title, description, children }: CardProps) => (
  <View style={styles.card}>
    <Icon name="map" size={32} color="accent" strokeWidth={1.5} />
    <AppText variant="title" style={[styles.center, styles.title]} accessibilityRole="header">
      {title}
    </AppText>
    <AppText variant="caption" color="ink2" style={styles.center}>
      {description}
    </AppText>
    {children}
  </View>
)

// SCR-10 위치 사용 꺼짐: 장소 API 는 LOCATION 동의가 있어야 해서 켜기만 제안한다
export const LocationOffCard = ({ isPending, onTurnOn }: { isPending: boolean; onTurnOn: () => void }) => (
  <Card
    title="함께 다녀온 곳을 모아볼까요?"
    description="사진의 촬영 위치를 쓰면 다녀온 곳을 자동으로 찾아드려요. 위치는 둘만 볼 수 있어요."
  >
    <Button label="사진 위치 사용하기" size="md" isLoading={isPending} onPress={onTurnOn} style={styles.button} />
  </Card>
)

// SCR-10 핀 없음
export const NoPinsCard = ({ onSearch }: { onSearch: () => void }) => (
  <Card
    title="아직 지도에 남긴 곳이 없어요"
    description="기록을 저장하면 사진 위치로 다녀온 곳을 찾아드려요. 검색해서 직접 남길 수도 있어요."
  >
    <Button label="직접 장소 추가" variant="text" size="md" onPress={onSearch} />
  </Card>
)

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: SPACING.screen,
    right: SPACING.screen,
    top: 220,
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: 28,
    paddingHorizontal: SPACING.screen,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    ...SHADOW[1],
  },
  center: { textAlign: 'center' },
  title: { fontSize: 20 },
  button: { marginTop: 6, borderRadius: RADIUS.pill },
})
