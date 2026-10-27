import { useLocalSearchParams } from 'expo-router'
import DiaryComposeScreen from '@/modules/diary/feature-diary-compose/DiaryComposeScreen'

// /diary/new — 새 기록. ?entryId= 이면 수정(상세의 더보기 메뉴)
const DiaryNewRoute = () => {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>()
  return <DiaryComposeScreen entryId={typeof entryId === 'string' && entryId.length > 0 ? entryId : undefined} />
}

export default DiaryNewRoute
