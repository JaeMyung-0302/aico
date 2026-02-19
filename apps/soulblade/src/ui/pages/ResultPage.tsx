import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import { useRunStore } from '@/stores/useRunStore'
import { calcMetaGoldReward, STAGE_DURATION } from '@soulblade/shared'
import styles from './ResultPage.module.scss'

const cx = classnames.bind(styles)

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}분 ${s}초`
}

export const ResultPage = () => {
  const navigate = useNavigate()
  const { stageId, killCount, survivedSeconds, playerLevel } = useRunStore()
  const endRun = useRunStore((s) => s.endRun)

  const stageDuration = stageId ? STAGE_DURATION[stageId] : 900
  const bossKilled = stageId ? survivedSeconds >= stageDuration : false
  const metaGold = stageId
    ? calcMetaGoldReward(stageId, survivedSeconds, stageDuration, bossKilled)
    : 0

  const handleLobby = () => {
    endRun()
    navigate('/')
  }

  const handleRetry = () => {
    endRun()
    navigate('/game')
  }

  return (
    <div className={cx('result')}>
      <h1 className={cx('title')}>
        {bossKilled ? '스테이지 클리어!' : '사망'}
      </h1>

      <div className={cx('stats')}>
        <div className={cx('statRow')}>
          <span className={cx('label')}>생존 시간</span>
          <span className={cx('value')}>{formatTime(survivedSeconds)}</span>
        </div>
        <div className={cx('statRow')}>
          <span className={cx('label')}>처치 수</span>
          <span className={cx('value')}>{killCount}</span>
        </div>
        <div className={cx('statRow')}>
          <span className={cx('label')}>도달 레벨</span>
          <span className={cx('value')}>Lv.{playerLevel}</span>
        </div>
        <div className={cx('divider')} />
        <div className={cx('statRow', 'highlight')}>
          <span className={cx('label')}>메타 골드</span>
          <span className={cx('value')}>+{metaGold}</span>
        </div>
      </div>

      <div className={cx('actions')}>
        <button className={cx('button', 'primary')} onClick={handleRetry}>
          다시 도전
        </button>
        <button className={cx('button', 'secondary')} onClick={handleLobby}>
          로비로
        </button>
      </div>
    </div>
  )
}
