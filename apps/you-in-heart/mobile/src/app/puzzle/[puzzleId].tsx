import { useLocalSearchParams } from 'expo-router'
import PuzzleDetailScreen from '@/modules/puzzle/feature-puzzle-detail/PuzzleDetailScreen'

// /puzzle/:puzzleId — 퍼즐 크게 보기·빈 날 채우기·완성(SCR-19e·19h·19d)
const PuzzleDetailRoute = () => {
  const { puzzleId } = useLocalSearchParams<{ puzzleId: string }>()
  return <PuzzleDetailScreen puzzleId={typeof puzzleId === 'string' ? puzzleId : ''} />
}

export default PuzzleDetailRoute
