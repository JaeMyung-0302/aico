import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { CharacterClass, ClassPassiveType } from '@soulblade/shared'
import { CLASS_CONFIGS, EMPTY_PERMANENT_STATS } from '@soulblade/shared'
import { useRunStore } from '@/stores/useRunStore'
import { useSaveStore } from '@/stores/useSaveStore'
import { eventBus } from '@/lib/event-bus'
import { ClassPreview } from '@/ui/components/ClassPreview'
import styles from './LobbyPage.module.scss'

const cx = classnames.bind(styles)

const CLASSES: CharacterClass[] = ['Warrior', 'Archer', 'Mage', 'Paladin']

const CLASS_NAME_KR: Record<CharacterClass, string> = {
  Warrior: '전사',
  Archer: '궁수',
  Mage: '마법사',
  Paladin: '팔라딘',
}

const PASSIVE_DESC: Record<ClassPassiveType, (value: number) => string> = {
  damage_reduction: (v) => `받는 피해 ${Math.round((1 - v) * 100)}% 감소`,
  crit_damage_bonus: (v) => `크리티컬 피해 ${Math.round((v - 1) * 100)}% 증가`,
  skill_multiplier: (v) => `스킬 피해 ${Math.round((v - 1) * 100)}% 증가`,
  heal_on_kill: (v) => `처치 시 최대 HP의 ${Math.round(v * 100)}% 회복`,
}

export const LobbyPage = () => {
  const navigate = useNavigate()
  const loaded = useSaveStore((s) => s.loaded)
  const classLocked = useSaveStore((s) => s.classLocked)
  const savedClass = useSaveStore((s) => s.characterClass)
  const savedLevel = useSaveStore((s) => s.characterLevel)
  const savedStats = useSaveStore((s) => s.characterStats)
  const savedGold = useSaveStore((s) => s.gold)
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('Warrior')
  const [confirming, setConfirming] = useState(false)

  // 기존 플레이어: 저장된 클래스로 바로 게임 시작
  const handleStartLocked = () => {
    useRunStore.setState({ classType: savedClass })
    const config = CLASS_CONFIGS[savedClass]
    const saveState = useSaveStore.getState()

    eventBus.emit('game:start', {
      mapId: saveState.currentMapId,
      classType: savedClass,
      stats: { ...config.baseStats, ...EMPTY_PERMANENT_STATS },
      equippedItems: [],
    })
    navigate('/game')
  }

  // 신규 플레이어: 클래스 확정 후 게임 시작
  const handleConfirmClass = () => {
    useSaveStore.getState().lockClass(selectedClass)
    useRunStore.setState({ classType: selectedClass })
    const config = CLASS_CONFIGS[selectedClass]

    eventBus.emit('game:start', {
      mapId: 'town',
      classType: selectedClass,
      stats: { ...config.baseStats, ...EMPTY_PERMANENT_STATS },
      equippedItems: [],
    })
    navigate('/game')
  }

  // 세이브 로딩 대기
  if (!loaded) {
    return (
      <div className={cx('lobby')}>
        <h1 className={cx('title')}>SoulBlade</h1>
        <p className={cx('subtitle')}>로딩 중...</p>
      </div>
    )
  }

  // --- 기존 플레이어 로비 ---
  if (classLocked) {
    const config = CLASS_CONFIGS[savedClass]
    const passive = PASSIVE_DESC[config.classPassive.type](config.classPassive.value)

    return (
      <div className={cx('lobby')}>
        <h1 className={cx('title')}>SoulBlade</h1>
        <p className={cx('subtitle')}>영혼의 전장</p>

        <div className={cx('lockedInfo')}>
          <ClassPreview classType={savedClass} />
          <div className={cx('lockedDetails')}>
            <span className={cx('lockedClass')}>{CLASS_NAME_KR[savedClass]}</span>
            <span className={cx('lockedLevel')}>Lv. {savedLevel}</span>
            <span className={cx('lockedStat')}>HP {savedStats.hp} / ATK {savedStats.atk} / DEF {savedStats.def}</span>
            <span className={cx('lockedPassive')}>{passive}</span>
            <span className={cx('lockedGold')}>Gold {savedGold}</span>
          </div>
        </div>

        <button className={cx('startButton')} onClick={handleStartLocked}>
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

  // --- 신규 플레이어: 클래스 선택 UI ---
  const selectedConfig = CLASS_CONFIGS[selectedClass]
  const selectedPassive = PASSIVE_DESC[selectedConfig.classPassive.type](selectedConfig.classPassive.value)

  return (
    <div className={cx('lobby')}>
      <h1 className={cx('title')}>SoulBlade</h1>
      <p className={cx('subtitle')}>영혼의 전장</p>

      <h2 className={cx('sectionTitle')}>클래스 선택</h2>

      <div className={cx('selectionLayout')}>
        {/* 좌측: 클래스 목록 + 상세 정보 */}
        <div className={cx('selectionLeft')}>
          <div className={cx('classList')}>
            {CLASSES.map((cls) => (
              <button
                key={cls}
                className={cx('classTab', { selected: selectedClass === cls })}
                onClick={() => { setSelectedClass(cls); setConfirming(false) }}
              >
                {CLASS_NAME_KR[cls]}
              </button>
            ))}
          </div>

          <div className={cx('classDetail')}>
            <p className={cx('detailDesc')}>{selectedConfig.description}</p>

            <div className={cx('detailStats')}>
              <span className={cx('statRow')}>HP {selectedConfig.baseStats.hp}</span>
              <span className={cx('statRow')}>ATK {selectedConfig.baseStats.atk}</span>
              <span className={cx('statRow')}>DEF {selectedConfig.baseStats.def}</span>
              <span className={cx('statRow')}>SPD {selectedConfig.baseStats.spd}</span>
              <span className={cx('statRow')}>CRIT {Math.round(selectedConfig.baseStats.crit * 100)}%</span>
            </div>

            <div className={cx('detailPassive')}>
              <span className={cx('passiveLabel')}>패시브</span>
              <span className={cx('passiveValue')}>{selectedPassive}</span>
            </div>
          </div>
        </div>

        {/* 우측: 캐릭터 프리뷰 */}
        <div className={cx('selectionRight')}>
          <ClassPreview classType={selectedClass} />
        </div>
      </div>

      {!confirming ? (
        <button className={cx('startButton')} onClick={() => setConfirming(true)}>
          {CLASS_NAME_KR[selectedClass]}(으)로 시작
        </button>
      ) : (
        <div className={cx('confirmGroup')}>
          <p className={cx('confirmText')}>
            한 번 선택하면 변경할 수 없습니다. {CLASS_NAME_KR[selectedClass]}(으)로 확정할까요?
          </p>
          <div className={cx('confirmButtons')}>
            <button className={cx('confirmButton')} onClick={handleConfirmClass}>
              확정
            </button>
            <button className={cx('cancelButton')} onClick={() => setConfirming(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
