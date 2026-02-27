import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import { getAllEvolutions } from '@/game/systems/evolution'
import styles from './SkillTreePage.module.scss'

const cx = classnames.bind(styles)

export const SkillTreePage = () => {
  const navigate = useNavigate()
  const evolutions = getAllEvolutions()

  return (
    <div className={cx('page')}>
      <header className={cx('header')}>
        <button className={cx('backBtn')} onClick={() => navigate('/')}>
          ←
        </button>
        <h1 className={cx('title')}>스킬 진화 도감</h1>
      </header>

      <p className={cx('desc')}>
        액티브 스킬 Lv.5 + 패시브 스킬 Lv.5 조합으로 진화 스킬을 획득하세요
      </p>

      <div className={cx('evolutionList')}>
        {evolutions.map((evo) => (
          <div key={evo.id} className={cx('evoCard')}>
            <span className={cx('evoName')}>{evo.name}</span>
            <p className={cx('evoDesc')}>{evo.description}</p>
            <div className={cx('evoReqs')}>
              <span className={cx('req')}>
                액티브: {evo.requiredActiveSkillId}
              </span>
              <span className={cx('req')}>
                패시브: {evo.requiredPassiveSkillId}
              </span>
            </div>
            <div className={cx('evoEffects')}>
              {Object.entries(evo.evolvedSkillEffect).map(([key, val]) => (
                <span key={key} className={cx('effect')}>
                  {key}: {val}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
