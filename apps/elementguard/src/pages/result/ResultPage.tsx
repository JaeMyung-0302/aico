import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/stores/useGameStore'
import { getArtifactById } from '@/game/data/artifacts'
import classNames from 'classnames/bind'
import styles from './ResultPage.module.scss'

const cx = classNames.bind(styles)

const ResultPage = () => {
  const navigate = useNavigate()
  const { wave, score, artifacts, isGameClear } = useGameStore()

  return (
    <div className={cx('container')}>
      <h1 className={cx('title')}>{isGameClear ? '클리어!' : '게임 오버'}</h1>

      <div className={cx('stats')}>
        <div className={cx('stat')}>
          <span className={cx('statLabel')}>도달 웨이브</span>
          <span className={cx('statValue')}>{wave}/30</span>
        </div>
        <div className={cx('stat')}>
          <span className={cx('statLabel')}>점수</span>
          <span className={cx('statValue')}>{score}</span>
        </div>
        <div className={cx('stat')}>
          <span className={cx('statLabel')}>유물</span>
          <span className={cx('statValue')}>{artifacts.length}개</span>
        </div>
      </div>

      {artifacts.length > 0 && (
        <div className={cx('artifactList')}>
          <h3>획득 유물</h3>
          <div className={cx('artifacts')}>
            {artifacts.map((id) => {
              const artifact = getArtifactById(id)
              return artifact ? (
                <div key={id} className={cx('artifactItem')}>
                  {artifact.name}
                </div>
              ) : null
            })}
          </div>
        </div>
      )}

      <div className={cx('actions')}>
        <button className={cx('button', 'primary')} onClick={() => navigate('/game')}>
          다시 도전
        </button>
        <button className={cx('button')} onClick={() => navigate('/')}>
          로비로
        </button>
      </div>
    </div>
  )
}

export default ResultPage
