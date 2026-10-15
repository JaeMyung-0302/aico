import { useLocalSearchParams } from 'expo-router'
import PlaceDetailScreen from '@/modules/places/feature-place-detail/PlaceDetailScreen'

// 디자인 10 장소 상세
const PlaceDetailRoute = () => {
  const { placeId } = useLocalSearchParams<{ placeId: string }>()
  return <PlaceDetailScreen placeId={placeId} />
}

export default PlaceDetailRoute
