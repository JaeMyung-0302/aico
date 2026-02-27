import { useEffect, useCallback } from 'react'
import classNames from 'classnames/bind'
import type { RankingEntry } from '@wasd/shared'
import styles from './RankingModal.module.scss'

const cx = classNames.bind(styles)

interface RankingModalProps {
  ranking: RankingEntry[]
  onClose: () => void
}

const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const RankingModal = ({ ranking, onClose }: RankingModalProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={cx('overlay')} onClick={handleOverlayClick}>
      <div className={cx('modal')}>
        <div className={cx('header')}>
          <h2 className={cx('title')}>랭킹 TOP 50</h2>
          <button className={cx('closeButton')} onClick={onClose}>
            &times;
          </button>
        </div>

        {ranking.length === 0 ? (
          <p className={cx('empty')}>아직 기록이 없습니다</p>
        ) : (
          <div className={cx('list')}>
            <div className={cx('listHeader')}>
              <span className={cx('rankCol')}>#</span>
              <span className={cx('nameCol')}>닉네임</span>
              <span className={cx('timeCol')}>시간</span>
              <span className={cx('deathCol')}>사망</span>
              <span className={cx('playerCol')}>인원</span>
            </div>
            {ranking.map((entry, index) => (
              <div key={`${entry.clearedAt}-${index}`} className={cx('row')}>
                <span className={cx('rankCol')}>{index + 1}</span>
                <span className={cx('nameCol')}>
                  {entry.nicknames.join(', ')}
                </span>
                <span className={cx('timeCol')}>
                  {formatTime(entry.elapsedTime)}
                </span>
                <span className={cx('deathCol')}>{entry.deaths}</span>
                <span className={cx('playerCol')}>{entry.playerCount}P</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RankingModal
