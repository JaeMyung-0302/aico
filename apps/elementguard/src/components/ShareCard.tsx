import { useRef } from 'react'
import classNames from 'classnames/bind'
import styles from './ShareCard.module.scss'

const cx = classNames.bind(styles)

interface ShareCardProps {
  wave: number
  score: number
  isGameClear: boolean
}

export const ShareCard = ({ wave, score, isGameClear }: ShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleShare = async () => {
    if (!navigator.share) return

    try {
      await navigator.share({
        title: 'ElementGuard: 속성 디펜스',
        text: `${isGameClear ? '클리어!' : `Wave ${wave}`} - ${score}점 달성! 도전해보세요!`,
        url: window.location.origin,
      })
    } catch {
      // 공유 취소
    }
  }

  return (
    <div className={cx('wrapper')}>
      <div ref={cardRef} className={cx('card')}>
        <h3 className={cx('cardTitle')}>ElementGuard</h3>
        <div className={cx('cardResult')}>
          {isGameClear ? '🏆 클리어!' : `Wave ${wave}/30`}
        </div>
        <div className={cx('cardScore')}>Score: {score}</div>
      </div>
      {'share' in navigator && (
        <button className={cx('shareButton')} onClick={handleShare}>
          결과 공유하기
        </button>
      )}
    </div>
  )
}
