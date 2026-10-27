import { useLocalSearchParams } from 'expo-router'
import PhotoViewerScreen from '@/modules/album/feature-photo-viewer/PhotoViewerScreen'

// /photos/:photoId — 앨범 그리드·일기 상세 캐러셀에서 온다
const PhotoViewerRoute = () => {
  const { photoId } = useLocalSearchParams<{ photoId: string }>()
  return <PhotoViewerScreen key={photoId} photoId={photoId} />
}

export default PhotoViewerRoute
