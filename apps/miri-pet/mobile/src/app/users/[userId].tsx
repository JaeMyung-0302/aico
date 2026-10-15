import { useLocalSearchParams } from 'expo-router'
import UserProfileScreen from '@/modules/social/feature-user-profile/UserProfileScreen'

// 디자인 17 사용자 프로필 (Phase 4: 팔로우·게시물 그리드 / Phase 5: 메시지 버튼)
const UserProfileRoute = () => {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  return <UserProfileScreen userId={userId} />
}

export default UserProfileRoute
