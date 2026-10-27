import { useLocalSearchParams } from 'expo-router'
import PlaceEntriesScreen from '@/modules/map/feature-place-entries/PlaceEntriesScreen'

// /places/:placeId — 지도 핀 시트의 "모두 보기"
const PlaceRoute = () => {
  const { placeId } = useLocalSearchParams<{ placeId: string }>()
  return <PlaceEntriesScreen placeId={typeof placeId === 'string' ? placeId : ''} />
}

export default PlaceRoute
