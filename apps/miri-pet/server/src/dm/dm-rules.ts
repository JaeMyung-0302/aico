// DM 공통 규칙(순수 함수)

// 두 사용자 id를 정렬해 저장한다 → (userLowId, userHighId) 유니크로 쌍당 대화 1개 (DB CHECK userLowId < userHighId)
export const orderPair = (userA: string, userB: string): { userLowId: string; userHighId: string } =>
  userA < userB ? { userLowId: userA, userHighId: userB } : { userLowId: userB, userHighId: userA }

// socket.io room: 사용자별 1개. 서버가 handshake에서 검증한 id로만 join한다
export const userRoom = (userId: string): string => `user:${userId}`

// 오프라인 수신자 Expo 푸시 본문. 보안 리뷰 LOW-6: 잠금 화면·알림 센터에 내용이 남지 않게 미리보기 없이 고정 문구(제목 = 보낸 사람 닉네임)
export const DM_PUSH_BODY = '새 메시지가 왔어요'
