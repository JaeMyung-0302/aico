import { Alert } from 'react-native'

// 저장 직후 화면이 바뀌므로 토스트 대신 네이티브 알림으로 알린다
export const alertPhotoNotSaved = (): void => {
  Alert.alert('사진은 저장하지 못했어요', '반려동물 정보는 저장됐어요. 사진은 잠시 후 다시 올려 주세요.')
}
