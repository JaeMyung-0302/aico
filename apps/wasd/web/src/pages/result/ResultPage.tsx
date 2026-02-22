import { useNavigate, Navigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useGameStore } from '@/stores/useGameStore'
import styles from './ResultPage.module.scss'

const cx = classNames.bind(styles)

const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const ResultPage = () => {
  const navigate = useNavigate()
  const gameResult = useGameStore((s) => s.gameResult)

  if (!gameResult) {
    return <Navigate to="/" replace />
  }

  const handleHome = () => {
    useGameStore.getState().reset()
    navigate('/')
  }

  const { ranking, myRank } = gameResult

  return (
    <div className={cx('container')}>
      <div className={cx('card')}>
        <h1 className={cx('title')}>Game Clear!</h1>
        <p className={cx('subtitle')}>모든 스테이지를 클리어했습니다</p>

        <div className={cx('stats')}>
          <div className={cx('stat')}>
            <span className={cx('statLabel')}>소요 시간</span>
            <span className={cx('statValue')}>{formatTime(gameResult.elapsedTime)}</span>
          </div>
          <div className={cx('stat')}>
            <span className={cx('statLabel')}>총 사망</span>
            <span className={cx('statValue', { danger: gameResult.deaths > 0 })}>
              {gameResult.deaths}회
            </span>
          </div>
        </div>

        {ranking && ranking.length > 0 && (
          <div className={cx('ranking')}>
            <h2 className={cx('rankingTitle')}>
              랭킹
              {myRank != null && (
                <span className={cx('myRankBadge')}>#{myRank}</span>
              )}
            </h2>
            <div className={cx('rankingList')}>
              <div className={cx('rankingHeader')}>
                <span className={cx('rankCol')}>#</span>
                <span className={cx('nameCol')}>닉네임</span>
                <span className={cx('timeCol')}>시간</span>
                <span className={cx('deathCol')}>사망</span>
                <span className={cx('playerCol')}>인원</span>
              </div>
              {ranking.map((entry, index) => (
                <div
                  key={`${entry.clearedAt}-${index}`}
                  className={cx('rankingRow', { highlight: myRank === index + 1 })}
                >
                  <span className={cx('rankCol')}>{index + 1}</span>
                  <span className={cx('nameCol')}>{entry.nicknames.join(', ')}</span>
                  <span className={cx('timeCol')}>{formatTime(entry.elapsedTime)}</span>
                  <span className={cx('deathCol')}>{entry.deaths}</span>
                  <span className={cx('playerCol')}>{entry.playerCount}P</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className={cx('homeButton')} onClick={handleHome}>
          메인으로 돌아가기
        </button>
      </div>
    </div>
  )
}

export default ResultPage
