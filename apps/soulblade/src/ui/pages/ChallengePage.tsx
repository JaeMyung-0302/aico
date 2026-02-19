import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { ChallengeMode } from '@soulblade/shared'
import { CHALLENGE_CONFIGS } from '@/game/systems/challenge'
import { useRunStore } from '@/stores/useRunStore'
import styles from './ChallengePage.module.scss'

const cx = classnames.bind(styles)

const MODE_ICONS: Record<ChallengeMode, string> = {
  time_attack: 'TA',
  infinite: 'INF',
  boss_rush: 'BR',
  restricted: 'RS',
}

export const ChallengePage = () => {
  const navigate = useNavigate()

  const handleStart = (mode: ChallengeMode) => {
    const config = CHALLENGE_CONFIGS.find((c) => c.mode === mode)
    if (!config) return

    useRunStore.setState({
      stageId: config.stageId,
      classType: useRunStore.getState().classType ?? 'Warrior',
    })

    // 도전 모드 정보는 URL 파라미터로 전달
    navigate(`/game?challenge=${mode}`)
  }

  return (
    <div className={cx('challenge')}>
      <button className={cx('backBtn')} onClick={() => navigate('/')}>
        뒤로
      </button>

      <h1 className={cx('title')}>도전 모드</h1>
      <p className={cx('subtitle')}>특수 규칙으로 한계에 도전하세요</p>

      <div className={cx('modeList')}>
        {CHALLENGE_CONFIGS.map((config) => (
          <button
            key={config.mode}
            className={cx('modeCard')}
            onClick={() => handleStart(config.mode)}
          >
            <span className={cx('modeIcon')}>{MODE_ICONS[config.mode]}</span>
            <div className={cx('modeInfo')}>
              <span className={cx('modeName')}>{config.name}</span>
              <span className={cx('modeDesc')}>{config.description}</span>
              <div className={cx('modeRules')}>
                {config.rules.durationOverride && (
                  <span className={cx('rule')}>
                    {Math.floor(config.rules.durationOverride / 60)}분
                  </span>
                )}
                {config.rules.spawnRateMultiplier !== 1.0 && (
                  <span className={cx('rule')}>
                    스폰 x{config.rules.spawnRateMultiplier}
                  </span>
                )}
                {config.rules.bossOnly && (
                  <span className={cx('rule')}>보스만</span>
                )}
                {config.rules.restrictedSkills && (
                  <span className={cx('rule')}>스킬 불가</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
