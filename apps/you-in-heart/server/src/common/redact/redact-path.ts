// URL·로그 문자열에서 push-tokens/ 다음 경로 세그먼트(Expo 푸시 토큰)를 가린다. 토큰은 기기에 알림을 보낼 수 있는 값이다
const PUSH_TOKEN_SEGMENT = /(push-tokens\/)[^/?#\s]+/g

export const redactPushTokenPath = (text: string): string => text.replace(PUSH_TOKEN_SEGMENT, '$1[Filtered]')
