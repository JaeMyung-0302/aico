import { useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStageStore } from '@/stores/useStageStore'
import { useTeamBattleAnimation } from '@/hooks/useTeamBattleAnimation'
import { StageResultModal } from './StageResultModal'
import { ELEMENT_COLORS } from '@monster-factory/shared'
import type { Element, TeamMember } from '@monster-factory/shared'
import enemySilhouette from '@/assets/enemy-silhouette.svg'
import styles from './StageBattlePage.module.scss'

const HpBar = ({ current, max, side }: { current: number; max: number; side: 'player' | 'enemy' }) => {
  const pct = max > 0 ? Math.max(0, (current / max) * 100) : 0
  return (
    <div className={styles.hpBarWrapper}>
      <div className={styles.hpBar}>
        <div
          className={`${styles.hpFill} ${side === 'player' ? styles.hpPlayer : styles.hpEnemy}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={styles.hpText}>
        {Math.max(0, Math.round(current))} / {Math.round(max)}
      </span>
    </div>
  )
}

const PartyIcon = ({ member, isActive, isDefeated, isEnemy }: {
  member: TeamMember
  isActive: boolean
  isDefeated: boolean
  isEnemy: boolean
}) => {
  const cls = [
    styles.partyIcon,
    isActive ? styles.partyIconActive : '',
    isDefeated ? styles.partyIconDefeated : '',
    isEnemy ? styles.partyIconEnemy : '',
  ].filter(Boolean).join(' ')

  const color = ELEMENT_COLORS[member.element as Element] ?? '#666'

  return (
    <div className={cls}>
      {!isEnemy && member.imageUrl ? (
        <img src={member.imageUrl} alt={member.name ?? 'monster'} />
      ) : (
        <div className={styles.partyIconPlaceholder} style={isEnemy ? { color, textShadow: `0 0 6px ${color}` } : undefined}>
          {member.element.charAt(0)}
        </div>
      )}
    </div>
  )
}

export const StageBattlePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { battleResult, battling, startBattle, clearBattleResult, fetchStages } = useStageStore()
  const startedRef = useRef(false)

  useEffect(() => {
    if (id && !startedRef.current) {
      startedRef.current = true
      startBattle(id)
    }
  }, [id, startBattle])

  const rounds = battleResult?.rounds ?? []
  const anim = useTeamBattleAnimation(rounds)

  // 고유 파티원 목록 추출
  const { playerMembers, enemyMembers } = useMemo(() => {
    const pMap = new Map<string, TeamMember>()
    const eMap = new Map<string, TeamMember>()
    for (const r of rounds) {
      if (!pMap.has(r.playerMember.monsterId)) pMap.set(r.playerMember.monsterId, r.playerMember)
      if (!eMap.has(r.enemyMember.monsterId)) eMap.set(r.enemyMember.monsterId, r.enemyMember)
    }
    return { playerMembers: [...pMap.values()], enemyMembers: [...eMap.values()] }
  }, [rounds])

  // 패배 여부 판별: 해당 멤버의 마지막 라운드 결과 기반
  const isDefeated = (memberId: string, side: 'player' | 'enemy') => {
    if (anim.currentRoundIndex < 0) return false
    const pastRounds = rounds.slice(0, anim.currentRoundIndex + 1)
    for (const r of pastRounds) {
      const isMember = side === 'player'
        ? r.playerMember.monsterId === memberId
        : r.enemyMember.monsterId === memberId
      if (isMember) {
        const loser = r.battleResult.winner === 'player' ? 'enemy' : 'player'
        if (loser === side) return true
      }
    }
    return false
  }

  if (battling) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingIcon}>⚔️</div>
          <span className={styles.loadingText}>전투 준비 중...</span>
        </div>
      </div>
    )
  }

  if (!battleResult) return null

  const handleClose = () => {
    clearBattleResult()
    fetchStages()
    navigate('/stages')
  }

  // 스킬 정보
  const isMagical = anim.skillCategory === 'magical'
  const skillColor = anim.skillElement ? ELEMENT_COLORS[anim.skillElement as Element] ?? '#94a3b8' : null

  // 전투 중 CSS 클래스
  const playerClass = [
    styles.monsterSprite,
    anim.currentAttacker === 'player' && anim.phase === 'attack' ? (isMagical ? styles.magicCast : styles.attackRight) : '',
    anim.currentAttacker === 'enemy' && anim.phase === 'hit' ? styles.shake : '',
    anim.currentAttacker === 'enemy' && anim.phase === 'hit' ? styles.blink : '',
    anim.phase === 'round_end' && anim.currentRoundIndex >= 0 && rounds[anim.currentRoundIndex]?.battleResult.winner === 'enemy' ? styles.fadeOut : '',
    anim.phase === 'round_intro' && anim.currentRoundIndex > 0 ? styles.slideIn : '',
  ].filter(Boolean).join(' ')

  const enemyColor = anim.enemyMember
    ? ELEMENT_COLORS[anim.enemyMember.element as Element] ?? '#94a3b8'
    : '#94a3b8'

  const enemyClass = [
    styles.enemySprite,
    anim.currentAttacker === 'enemy' && anim.phase === 'attack' ? (isMagical ? styles.magicCast : styles.attackLeft) : '',
    anim.currentAttacker === 'player' && anim.phase === 'hit' ? styles.shake : '',
    anim.currentAttacker === 'player' && anim.phase === 'hit' ? styles.blink : '',
    anim.phase === 'round_end' && anim.currentRoundIndex >= 0 && rounds[anim.currentRoundIndex]?.battleResult.winner === 'player' ? styles.fadeOut : '',
    anim.phase === 'round_intro' && anim.currentRoundIndex > 0 ? styles.slideIn : '',
  ].filter(Boolean).join(' ')

  const showPlayerDamage = anim.currentAttacker === 'enemy' && (anim.phase === 'hit' || anim.phase === 'damage')
  const showEnemyDamage = anim.currentAttacker === 'player' && (anim.phase === 'hit' || anim.phase === 'damage')

  const currentTurn = anim.currentTurnIndex >= 0 && anim.currentRoundIndex >= 0
    ? rounds[anim.currentRoundIndex]?.battleResult.turns[anim.currentTurnIndex]
    : null

  return (
    <div className={styles.container}>
      {/* 시너지 배너 */}
      {battleResult.synergyBonus && anim.isPlaying && (
        <div className={styles.synergyBanner}>
          {battleResult.synergyBonus.type} 시너지 활성!
        </div>
      )}

      {/* 라운드 배너 */}
      {anim.phase === 'round_intro' && anim.currentRoundIndex >= 0 && (
        <div className={styles.roundBanner}>
          Round {anim.currentRoundIndex + 1}
        </div>
      )}

      {/* 배틀 씬 */}
      {anim.isPlaying && anim.playerMember && anim.enemyMember && (
        <>
          <div className={styles.battleScene}>
            {/* 플레이어 측 */}
            <div className={styles.fighterSide}>
              <div className={styles.spriteWrapper}>
                <div className={playerClass}>
                  {anim.playerMember.imageUrl ? (
                    <img src={anim.playerMember.imageUrl} alt="My monster" className={styles.spriteImg} />
                  ) : (
                    <div className={styles.spritePlaceholder}>P</div>
                  )}
                </div>
                {showPlayerDamage && anim.currentDamage !== null && (
                  <div
                    className={`${styles.damagePopup} ${anim.isCritical ? styles.criticalDamage : ''}`}
                    style={isMagical && skillColor ? { color: skillColor, textShadow: `0 0 12px ${skillColor}, 0 2px 4px rgba(0,0,0,0.6)` } : undefined}
                  >
                    {anim.currentDamage}
                    {anim.isCritical && <span className={styles.critLabel}>CRIT!</span>}
                  </div>
                )}
                {showPlayerDamage && isMagical && skillColor && (
                  <div className={styles.magicGlow} style={{ '--glow-color': skillColor } as React.CSSProperties} />
                )}
              </div>
              <HpBar current={anim.playerHp} max={anim.maxPlayerHp} side="player" />
              <span className={styles.fighterLabel}>
                {anim.playerMember.name ?? anim.playerMember.element}
              </span>
            </div>

            <div className={styles.vsLabel}>VS</div>

            {/* 적 측 */}
            <div className={styles.fighterSide}>
              <div className={styles.spriteWrapper}>
                <div className={enemyClass} style={{ color: enemyColor, filter: `drop-shadow(0 0 8px ${enemyColor})` }}>
                  <img src={enemySilhouette} alt="Enemy" className={styles.spriteImg} />
                </div>
                {showEnemyDamage && anim.currentDamage !== null && (
                  <div
                    className={`${styles.damagePopup} ${anim.isCritical ? styles.criticalDamage : ''}`}
                    style={isMagical && skillColor ? { color: skillColor, textShadow: `0 0 12px ${skillColor}, 0 2px 4px rgba(0,0,0,0.6)` } : undefined}
                  >
                    {anim.currentDamage}
                    {anim.isCritical && <span className={styles.critLabel}>CRIT!</span>}
                  </div>
                )}
                {showEnemyDamage && isMagical && skillColor && (
                  <div className={styles.magicGlow} style={{ '--glow-color': skillColor } as React.CSSProperties} />
                )}
              </div>
              <HpBar current={anim.enemyHp} max={anim.maxEnemyHp} side="enemy" />
              <span className={styles.fighterLabel}>
                {anim.enemyMember.element}
              </span>
            </div>
          </div>

          {/* 턴 정보 */}
          {currentTurn && (
            <div className={styles.turnInfo}>
              <span>{currentTurn.attacker === 'player' ? (anim.playerMember.name ?? 'My Monster') : 'Enemy'}</span>
              {currentTurn.skillName && (
                <span
                  className={`${styles.skillBadge} ${currentTurn.skillCategory === 'magical' ? styles.skillMagical : styles.skillPhysical}`}
                  style={currentTurn.skillElement ? { '--skill-color': ELEMENT_COLORS[currentTurn.skillElement as Element] ?? '#94a3b8' } as React.CSSProperties : undefined}
                >
                  {currentTurn.skillName}
                </span>
              )}
              {!currentTurn.skillName && <span>attacks!</span>}
              {currentTurn.isCritical && <span className={styles.critBadge}>CRITICAL</span>}
            </div>
          )}

          {/* 파티 대기열 */}
          <div className={styles.partyQueue}>
            <div className={styles.partyQueueSide}>
              {playerMembers.map((m) => (
                <PartyIcon
                  key={m.monsterId}
                  member={m}
                  isActive={anim.playerMember?.monsterId === m.monsterId}
                  isDefeated={isDefeated(m.monsterId, 'player')}
                  isEnemy={false}
                />
              ))}
            </div>
            <div className={styles.partyQueueSide}>
              {enemyMembers.map((m) => (
                <PartyIcon
                  key={m.monsterId}
                  member={m}
                  isActive={anim.enemyMember?.monsterId === m.monsterId}
                  isDefeated={isDefeated(m.monsterId, 'enemy')}
                  isEnemy={true}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* SKIP 버튼 */}
      {anim.isPlaying && !anim.isFinished && (
        <button className={styles.skipButton} onClick={anim.skip}>
          SKIP &gt;&gt;
        </button>
      )}

      {/* 결과 모달 */}
      {anim.isFinished && (
        <StageResultModal result={battleResult} onClose={handleClose} />
      )}

      {/* 초기 로딩 */}
      {anim.phase === 'idle' && !anim.isFinished && !anim.isPlaying && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingIcon}>⚔️</div>
          <span className={styles.loadingText}>전투 시작...</span>
        </div>
      )}
    </div>
  )
}
