import { useMutation } from '@tanstack/react-query'
import { signOutDevice } from './sign-out-device'

// 기기에서 먼저 로그아웃하고(화면이 바로 /login으로) 푸시 해제·서버 세션 폐기·SDK 로그아웃은 뒤에서 한다
export const useLogout = () => useMutation({ mutationFn: () => signOutDevice() })
