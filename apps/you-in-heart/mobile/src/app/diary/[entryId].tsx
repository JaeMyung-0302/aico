import { useLocalSearchParams } from 'expo-router'
import DiaryDetailScreen from '@/modules/diary/feature-diary-detail/DiaryDetailScreen'

// /diary/:entryId — 타임라인 카드·뷰어 "기록 보기"·상대 새 기록 푸시(PARTNER_ENTRY)에서 온다
const DiaryDetailRoute = () => {
  const { entryId } = useLocalSearchParams<{ entryId: string }>()
  return <DiaryDetailScreen key={entryId} entryId={entryId} />
}

export default DiaryDetailRoute
