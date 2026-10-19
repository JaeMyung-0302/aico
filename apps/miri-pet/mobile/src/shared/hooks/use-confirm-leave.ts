import { useNavigation } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { Alert } from 'react-native'

// 작성 중인 화면을 떠나려 할 때(헤더 뒤로·안드로이드 뒤로·스와이프) 한 번 묻는다.
// 저장·게시처럼 의도된 이동 전에는 hasUnsavedChanges를 false로 내려야 한다
export const useConfirmLeave = (hasUnsavedChanges: boolean) => {
  const navigation = useNavigation()
  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    Alert.alert('작성 중인 내용이 사라져요', '지금 나가면 입력한 내용이 저장되지 않아요.', [
      { text: '계속 작성', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ])
  })
}
