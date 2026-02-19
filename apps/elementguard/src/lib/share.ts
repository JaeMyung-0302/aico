// Canvas 기반 결과 공유 카드 생성 + 딥링크

const CARD_WIDTH = 600
const CARD_HEIGHT = 400
const BG_COLOR = '#1a1a2e'

interface ShareCardData {
  wave: number
  score: number
  isGameClear: boolean
  artifacts: string[]
}

export const generateShareImage = async (data: ShareCardData): Promise<Blob | null> => {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 배경
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // 상단 그라디언트 라인
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0)
  gradient.addColorStop(0, '#ff4444')
  gradient.addColorStop(0.5, '#ffdd00')
  gradient.addColorStop(1, '#44aaff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CARD_WIDTH, 4)

  // 타이틀
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('ElementGuard: 속성 디펜스', CARD_WIDTH / 2, 60)

  // 결과
  ctx.fillStyle = data.isGameClear ? '#ffdd00' : '#ff6666'
  ctx.font = 'bold 48px sans-serif'
  ctx.fillText(
    data.isGameClear ? 'CLEAR!' : `Wave ${data.wave}/30`,
    CARD_WIDTH / 2,
    160,
  )

  // 스코어
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px sans-serif'
  ctx.fillText(`Score: ${data.score.toLocaleString()}`, CARD_WIDTH / 2, 220)

  // 유물 수
  ctx.fillStyle = '#aaaaaa'
  ctx.font = '16px sans-serif'
  ctx.fillText(`유물 ${data.artifacts.length}개 수집`, CARD_WIDTH / 2, 270)

  // 하단 CTA
  ctx.fillStyle = '#666666'
  ctx.font = '14px sans-serif'
  ctx.fillText('나도 도전해보기!', CARD_WIDTH / 2, 360)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

export const shareResult = async (data: ShareCardData): Promise<boolean> => {
  const referralUrl = buildDeeplink()

  // Web Share API (이미지 포함)
  if (navigator.share) {
    try {
      const blob = await generateShareImage(data)
      const shareData: ShareData = {
        title: 'ElementGuard: 속성 디펜스',
        text: `${data.isGameClear ? '클리어!' : `Wave ${data.wave}`} - ${data.score}점 달성! 도전해보세요!`,
        url: referralUrl,
      }

      // 이미지 파일 공유가 가능한 경우
      if (blob) {
        const file = new File([blob], 'elementguard-result.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          shareData.files = [file]
        }
      }

      await navigator.share(shareData)
      return true
    } catch {
      return false // 공유 취소
    }
  }

  // Fallback: 클립보드 복사
  try {
    const text = `ElementGuard ${data.isGameClear ? 'CLEAR' : `Wave ${data.wave}`} - ${data.score}점! ${referralUrl}`
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const buildDeeplink = (): string => {
  const userId = localStorage.getItem('eg_referral_id')
  const base = window.location.origin
  if (!userId) return base
  return `${base}?ref=${encodeURIComponent(userId)}`
}
