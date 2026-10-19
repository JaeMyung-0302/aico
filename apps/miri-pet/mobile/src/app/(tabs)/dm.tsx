import { useLocalSearchParams } from 'expo-router'
import DmInboxScreen from '@/modules/dm/feature-dm-inbox/DmInboxScreen'

// 디자인 12 대화 목록 (Phase 5). ?tab=requests → 요청 탭 (메시지 요청 알림)
const DmRoute = () => {
  const { tab } = useLocalSearchParams<{ tab?: string }>()
  return <DmInboxScreen requestedTab={tab === 'requests' ? 'REQUEST' : undefined} />
}

export default DmRoute
