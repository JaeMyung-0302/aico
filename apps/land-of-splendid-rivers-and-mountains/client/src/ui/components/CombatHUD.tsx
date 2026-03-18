import { useEffect, useRef, useState } from 'react'
import { eventBus } from '@/lib/event-bus'
import { useGameStore } from '@/stores/useGameStore'
import { t } from '@/i18n'

const CombatHUD = () => {
  const dungeonFloor = useGameStore((s) => s.dungeonFloor)
  const [showHit, setShowHit] = useState(false)
  const hitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onPlayerHit = ({ damage }: { damage: number; currentHp: number }) => {
      if (damage <= 0) return
      setShowHit(true)
      if (hitTimerRef.current) clearTimeout(hitTimerRef.current)
      hitTimerRef.current = setTimeout(() => setShowHit(false), 200)
    }

    eventBus.on('combat:playerHit', onPlayerHit)
    return () => {
      eventBus.off('combat:playerHit', onPlayerHit)
      if (hitTimerRef.current) clearTimeout(hitTimerRef.current)
    }
  }, [])

  return (
    <>
      {dungeonFloor > 0 && (
        <div style={styles.floorText}>
          {t('ui.dungeon.floor')} {dungeonFloor}/{4}
        </div>
      )}
      {showHit && <div style={styles.hitOverlay} />}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  floorText: {
    position: 'absolute',
    top: 66,
    left: 8,
    fontSize: 9,
    color: '#ffd700',
    fontFamily: '"Noto Sans KR", sans-serif',
    pointerEvents: 'none',
    zIndex: 100,
  },
  hitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    pointerEvents: 'none',
    zIndex: 50,
    transition: 'opacity 0.3s ease',
  },
}

export default CombatHUD
