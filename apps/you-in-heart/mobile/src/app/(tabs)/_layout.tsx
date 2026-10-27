import { Tabs } from 'expo-router'
import Icon, { type IconName } from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { FONT_FAMILY } from '@/design-system/tokens/typography'

const tabIcon = (name: IconName) => {
  const TabIcon = ({ focused }: { focused: boolean }) => <Icon name={name} color={focused ? 'ink' : 'ink3'} />
  return TabIcon
}

// SCR-03 하단 탭 4개: 홈 / 타임라인 / 앨범 / 지도 (선택 탭은 ink + bold, 포인트 색은 쓰지 않는다)
const TabsLayout = () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.ink,
      tabBarInactiveTintColor: COLORS.ink3,
      tabBarLabelStyle: { fontFamily: FONT_FAMILY.regular, fontSize: 11 },
      tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
    }}
  >
    <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home') }} />
    <Tabs.Screen name="timeline" options={{ title: '타임라인', tabBarIcon: tabIcon('timeline') }} />
    <Tabs.Screen name="album" options={{ title: '앨범', tabBarIcon: tabIcon('album') }} />
    <Tabs.Screen name="map" options={{ title: '지도', tabBarIcon: tabIcon('map') }} />
  </Tabs>
)

export default TabsLayout
