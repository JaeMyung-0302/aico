import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { CharacterClass, ClassPassiveType } from '@soulblade/shared'
import { CLASS_CONFIGS, EMPTY_PERMANENT_STATS } from '@soulblade/shared'
import { useRunStore } from '@/stores/useRunStore'
import { useSaveStore } from '@/stores/useSaveStore'
import { eventBus } from '@/lib/event-bus'
import { checkNameAvailable, validateNameLocal } from '@/lib/character-name'
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
  const savedName = useSaveStore((s) => s.characterName)
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('Warrior')
  const [confirming, setConfirming] = useState(false)
  const [charName, setCharName] = useState('')
  const [nameError, setNameError] = useState('')
  const [nameChecking, setNameChecking] = useState(false)

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
      characterName: savedName || undefined,
    })
    navigate('/game')
  }

  // 이름 입력 변경 핸들러
  const handleNameChange = (value: string) => {
    setCharName(value)
    setNameError('')
  }

  // 이름 입력 후 확정 단계로 전환
  const handleProceedToConfirm = async () => {
    const localResult = validateNameLocal(charName)
    if (!localResult.valid) {
      setNameError(localResult.error ?? '')
      return
    }

    setNameChecking(true)
    try {
      const result = await checkNameAvailable(charName)
      if (!result.valid) {
        setNameError(result.error ?? '')
        return
      }
      setConfirming(true)
    } catch {
      setNameError('이름 확인 중 오류가 발생했습니다.')
    } finally {
      setNameChecking(false)
    }
  }

  // 신규 플레이어: 클래스 + 이름 확정 후 게임 시작
  const handleConfirmClass = async () => {
    // 최종 중복 검사 (TOCTOU 방어: unique_violation은 DB가 최종 방어)
    setNameChecking(true)
    try {
      const result = await checkNameAvailable(charName)
      if (!result.valid) {
        setNameError(result.error ?? '')
        setConfirming(false)
        return
      }

      const trimmedName = result.trimmedName ?? charName.trim()
      useSaveStore.getState().lockClass(selectedClass, trimmedName)
      useRunStore.setState({ classType: selectedClass })
      const config = CLASS_CONFIGS[selectedClass]

      eventBus.emit('game:start', {
        mapId: 'town',
        classType: selectedClass,
        stats: { ...config.baseStats, ...EMPTY_PERMANENT_STATS },
        equippedItems: [],
        characterName: trimmedName,
      })
      navigate('/game')
    } catch {
      setNameError('이름 확인 중 오류가 발생했습니다.')
      setConfirming(false)
    } finally {
      setNameChecking(false)
    }
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
            {savedName && <span className={cx('lockedName')}>{savedName}</span>}
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
                onClick={() => { setSelectedClass(cls); setConfirming(false); setNameError('') }}
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

      {/* 이름 입력 */}
      <div className={cx('nameInputGroup')}>
        <label className={cx('nameLabel')} htmlFor="char-name">캐릭터명</label>
        <input
          id="char-name"
          className={cx('nameInput', { error: !!nameError })}
          type="text"
          placeholder="2~8자 (한글, 영문, 숫자)"
          maxLength={8}
          value={charName}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={confirming || nameChecking}
        />
        {nameError && <span className={cx('nameError')}>{nameError}</span>}
      </div>

      {!confirming ? (
        <button
          className={cx('startButton')}
          onClick={handleProceedToConfirm}
          disabled={nameChecking || charName.trim().length === 0}
        >
          {nameChecking ? '확인 중...' : `${CLASS_NAME_KR[selectedClass]}(으)로 시작`}
        </button>
      ) : (
        <div className={cx('confirmGroup')}>
          <p className={cx('confirmText')}>
            한 번 선택하면 변경할 수 없습니다. &quot;{charName.trim()}&quot; {CLASS_NAME_KR[selectedClass]}(으)로 확정할까요?
          </p>
          <div className={cx('confirmButtons')}>
            <button className={cx('confirmButton')} onClick={handleConfirmClass} disabled={nameChecking}>
              {nameChecking ? '확인 중...' : '확정'}
            </button>
            <button className={cx('cancelButton')} onClick={() => setConfirming(false)} disabled={nameChecking}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
