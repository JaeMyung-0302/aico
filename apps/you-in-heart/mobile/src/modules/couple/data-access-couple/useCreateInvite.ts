import { useMutation } from '@tanstack/react-query'
import { createInvite } from './couple-api'

// 초대 코드 화면에 들어오면 1회, 만료되면 "새 코드 만들기"로 다시 만든다
export const useCreateInvite = () => useMutation({ mutationFn: () => createInvite() })
