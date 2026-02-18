import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDungeonStore } from '@/stores/useDungeonStore'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { useBattleAnimation } from '@/hooks/useBattleAnimation'
import { BattleResultModal } from '@/components/BattleResult'
import { ELEMENT_COLORS } from '@monster-factory/shared'
import type { Element } from '@monster-factory/shared'
import enemySilhouette from '@/assets/enemy-silhouette.svg'
import styles from './DungeonBattlePage.module.scss'

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

export const DungeonBattlePage = () => {
  const navigate = useNavigate()
  const { battleResult, clearResult } = useDungeonStore()
  const { activeMonster: monster } = useMonsterStore()

  const turns = battleResult?.turns ?? []
  const anim = useBattleAnimation(turns)

  useEffect(() => {
    if (!battleResult) {
      navigate('/dungeon')
    }
  }, [battleResult, navigate])

  if (!battleResult) return null

  const handleClose = () => {
    clearResult()
    navigate('/game')
  }

  const enemyColor = ELEMENT_COLORS[battleResult.enemyElement as Element] ?? '#94a3b8'

  const isMagical = anim.skillCategory === 'magical'
  const skillColor = anim.skillElement ? ELEMENT_COLORS[anim.skillElement as Element] ?? '#94a3b8' : null

  const playerClass = [
    styles.monsterSprite,
    anim.currentAttacker === 'player' && anim.phase === 'attack' ? (isMagical ? styles.magicCast : styles.attackRight) : '',
    anim.currentAttacker === 'enemy' && anim.phase === 'hit' ? styles.shake : '',
    anim.currentAttacker === 'enemy' && anim.phase === 'hit' ? styles.blink : '',
  ].filter(Boolean).join(' ')

  const enemyClass = [
    styles.enemySprite,
    anim.currentAttacker === 'enemy' && anim.phase === 'attack' ? (isMagical ? styles.magicCast : styles.attackLeft) : '',
    anim.currentAttacker === 'player' && anim.phase === 'hit' ? styles.shake : '',
    anim.currentAttacker === 'player' && anim.phase === 'hit' ? styles.blink : '',
  ].filter(Boolean).join(' ')

  const showPlayerDamage = anim.currentAttacker === 'enemy' && (anim.phase === 'hit' || anim.phase === 'damage')
  const showEnemyDamage = anim.currentAttacker === 'player' && (anim.phase === 'hit' || anim.phase === 'damage')

  const currentTurn = anim.currentTurnIndex >= 0 && anim.currentTurnIndex < turns.length
    ? turns[anim.currentTurnIndex]
    : null

  return (
    <div className={styles.container}>
      <div className={styles.turnCounter}>
        Turn {anim.currentTurnIndex >= 0 ? anim.currentTurnIndex + 1 : 0} / {turns.length}
      </div>

      <div className={styles.battleScene}>
        {/* Player side */}
        <div className={styles.fighterSide}>
          <div className={styles.spriteWrapper}>
            <div className={playerClass}>
              {monster?.imageUrl ? (
                <img src={monster.imageUrl} alt="My monster" className={styles.spriteImg} />
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
          <span className={styles.fighterLabel}>My Monster</span>
        </div>

        <div className={styles.vsLabel}>VS</div>

        {/* Enemy side */}
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
            {battleResult.enemyElement ?? 'Enemy'}
          </span>
        </div>
      </div>

      {/* Turn log (compact) */}
      {currentTurn && (
        <div className={styles.turnInfo}>
          <span>{currentTurn.attacker === 'player' ? 'My Monster' : 'Enemy'}</span>
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

      {anim.isFinished && (
        <BattleResultModal result={battleResult} onClose={handleClose} />
      )}

      {anim.phase === 'idle' && !anim.isFinished && !anim.isPlaying && (
        <div className={styles.loadingText}>Preparing battle...</div>
      )}
    </div>
  )
}
