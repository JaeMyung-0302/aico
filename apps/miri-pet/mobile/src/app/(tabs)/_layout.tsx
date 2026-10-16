import { Tabs } from 'expo-router'
import Icon, { type IconName } from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'
import { useDmRealtime } from '@/modules/dm/data-access-dm/useDmRealtime'

const tabIcon = (name: IconName) => {
  const TabIcon = ({ focused }: { focused: boolean }) => <Icon name={name} color={focused ? 'primary' : 'ink3'} />
  return TabIcon
}

// 하단 탭 4개: 홈 / 장소 / 대화 / 내 펫 (디자인 04·08·12·14).
// 로그인한 탭 영역이 떠 있는 동안 DM 소켓을 하나 연결한다(대화방은 탭 위에 쌓이므로 계속 유지)
const TabsLayout = () => {
  useDmRealtime()
  return <TabsNavigator />
}

const TabsNavigator = () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.ink3,
      tabBarLabelStyle: TYPOGRAPHY.tab,
      tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
    }}
  >
    <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home') }} />
    <Tabs.Screen name="places" options={{ title: '장소', tabBarIcon: tabIcon('pin') }} />
    <Tabs.Screen name="dm" options={{ title: '대화', tabBarIcon: tabIcon('chat') }} />
    <Tabs.Screen name="pets" options={{ title: '내 펫', tabBarIcon: tabIcon('paw') }} />
  </Tabs>
)

export default TabsLayout
