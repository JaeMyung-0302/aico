const FALLBACK_NAME = '사진 속 장소'
const MAX_PLACE_NAME_LENGTH = 50

// 역지오코딩 주소 → 제안 이름 "성수동1가 근처". 지번·건물 번호(숫자로 시작)는 뺀다
export const suggestionName = (address: string | null): string => {
  const area = (address ?? '')
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '' && !/^\d/.test(token))
    .at(-1)
  return area ? `${area} 근처`.slice(0, MAX_PLACE_NAME_LENGTH) : FALLBACK_NAME
}
