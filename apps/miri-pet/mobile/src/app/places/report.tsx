import { useLocalSearchParams } from 'expo-router'
import PlaceReportScreen from '@/modules/places/feature-place-report/PlaceReportScreen'
import { parseReportLocation } from '@/modules/places/util-place-report'

// 디자인 11 장소 제보. ?placeId= (수정·폐업) 또는 ?lat=&lng= (지도 중심에서 새 장소)
const PlaceReportRoute = () => {
  const params = useLocalSearchParams<{ placeId?: string; lat?: string; lng?: string }>()
  return <PlaceReportScreen placeId={params.placeId} location={parseReportLocation(params.lat, params.lng)} />
}

export default PlaceReportRoute
