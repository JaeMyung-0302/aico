import { useLocalSearchParams } from 'expo-router'
import DmChatScreen from '@/modules/dm/feature-dm-chat/DmChatScreen'

// 디자인 13 대화방 (Phase 5)
const DmChatRoute = () => {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>()
  return <DmChatScreen conversationId={conversationId} />
}

export default DmChatRoute
