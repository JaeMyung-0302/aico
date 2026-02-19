import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { CharacterClass } from '@soulblade/shared'
import { CLASS_CONFIGS, EMPTY_PERMANENT_STATS } from '@soulblade/shared'
import { useRunStore } from '@/stores/useRunStore'
import { eventBus } from '@/lib/event-bus'
import styles from './LobbyPage.module.scss'

const cx = classnames.bind(styles)

const CLASSES: CharacterClass[] = ['Warrior', 'Archer', 'Mage', 'Paladin']

export const LobbyPage = () => {
  const navigate = useNavigate()
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('Warrior')

  const handleStart = () => {
    useRunStore.setState({ classType: selectedClass })
    const config = CLASS_CONFIGS[selectedClass]
    eventBus.emit('game:start', {
      stageId: 'serpent_forest',
      classType: selectedClass,
      stats: { ...config.baseStats, ...EMPTY_PERMANENT_STATS },
      equippedItems: [],
    })
    navigate('/game')
  }

  return (
    <div className={cx('lobby')}>
      <h1 className={cx('title')}>SoulBlade</h1>
      <p className={cx('subtitle')}>영혼의 전장</p>

      <section className={cx('section')}>
        <h2 className={cx('sectionTitle')}>클래스 선택</h2>
        <div className={cx('classList')}>
          {CLASSES.map((cls) => {
            const config = CLASS_CONFIGS[cls]
            return (
              <button
                key={cls}
                className={cx('classCard', { selected: selectedClass === cls })}
                onClick={() => setSelectedClass(cls)}
              >
                <span className={cx('className')}>{cls}</span>
                <span className={cx('classDesc')}>{config.description}</span>
              </button>
            )
          })}
        </div>
      </section>

      <button className={cx('startButton')} onClick={handleStart}>
        게임 시작
      </button>

      <div className={cx('menuList')}>
        <button className={cx('menuButton')} onClick={() => navigate('/inventory')}>
          인벤토리
        </button>
        <button className={cx('menuButton')} onClick={() => navigate('/upgrade')}>
          영구 강화
        </button>
        <button className={cx('menuButton')} onClick={() => navigate('/skill-tree')}>
          스킬 진화
        </button>
        <button className={cx('menuButton')} onClick={() => navigate('/daily')}>
          일일 출석
        </button>
        <button className={cx('menuButton')} onClick={() => navigate('/challenge')}>
          도전 모드
        </button>
      </div>
    </div>
  )
}
