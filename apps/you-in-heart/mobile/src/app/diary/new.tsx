import { isoDateSchema } from '@you-in-heart/shared'
import { useLocalSearchParams } from 'expo-router'
import DiaryComposeScreen from '@/modules/diary/feature-diary-compose/DiaryComposeScreen'

// /diary/new — 새 기록. ?entryId= 이면 수정(상세의 더보기 메뉴), ?date=YYYY-MM-DD 면 그 날짜로 시작(퍼즐 지난 날 채우기)
const DiaryNewRoute = () => {
  const { entryId, date } = useLocalSearchParams<{ entryId?: string; date?: string }>()
  const initialDate = isoDateSchema.safeParse(date)
  return (
    <DiaryComposeScreen
      entryId={typeof entryId === 'string' && entryId.length > 0 ? entryId : undefined}
      initialDate={initialDate.success ? initialDate.data : undefined}
    />
  )
}

export default DiaryNewRoute
