import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UNITS } from '@/game/data/units'
import { FUSION_UNITS } from '@/game/data/fusions'
import { ARTIFACTS } from '@/game/data/artifacts'
import classNames from 'classnames/bind'
import styles from './ArchivePage.module.scss'

const cx = classNames.bind(styles)

type Tab = 'units' | 'fusions' | 'artifacts'

const ArchivePage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('units')

  return (
    <div className={cx('container')}>
      <header className={cx('header')}>
        <button className={cx('backButton')} onClick={() => navigate('/')}>
          ← 로비
        </button>
        <h1 className={cx('title')}>도감</h1>
      </header>

      <div className={cx('tabs')}>
        {(['units', 'fusions', 'artifacts'] as const).map((tab) => (
          <button
            key={tab}
            className={cx('tab', { active: activeTab === tab })}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'units' ? '유닛' : tab === 'fusions' ? '융합' : '유물'}
          </button>
        ))}
      </div>

      <div className={cx('content')}>
        {activeTab === 'units' && (
          <div className={cx('grid')}>
            {UNITS.map((unit) => (
              <div key={unit.id} className={cx('card')}>
                <div className={cx('cardElement', unit.element)} />
                <div className={cx('cardInfo')}>
                  <span className={cx('cardName')}>{unit.name}</span>
                  <span className={cx('cardType')}>{unit.type === 'basic' ? '기본' : '특수'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'fusions' && (
          <div className={cx('grid')}>
            {FUSION_UNITS.map((fusion) => (
              <div key={fusion.id} className={cx('card')}>
                <div className={cx('cardElement', 'fusion')} />
                <div className={cx('cardInfo')}>
                  <span className={cx('cardName')}>{fusion.name}</span>
                  <span className={cx('cardType')}>{fusion.elements.join(' + ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div className={cx('grid')}>
            {ARTIFACTS.map((artifact) => (
              <div key={artifact.id} className={cx('card')}>
                <span className={cx('artifactRarity', artifact.rarity)}>
                  {artifact.rarity === 'epic' ? '★' : artifact.rarity === 'rare' ? '◆' : '●'}
                </span>
                <div className={cx('cardInfo')}>
                  <span className={cx('cardName')}>{artifact.name}</span>
                  <span className={cx('cardDesc')}>{artifact.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ArchivePage
