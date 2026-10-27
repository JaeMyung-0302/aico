import { SetMetadata } from '@nestjs/common'

export const ALLOW_DURING_UNLINKING_KEY = 'yih:allow-during-unlinking'

// 연결 해제 유예(UNLINKING) 중에도 쓰기 요청을 허용한다. 내보내기(/export)와 재연결만 붙인다
export const AllowDuringUnlinking = () => SetMetadata(ALLOW_DURING_UNLINKING_KEY, true)
