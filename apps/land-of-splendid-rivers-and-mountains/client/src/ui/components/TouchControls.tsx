import { useCallback } from 'react'
import { eventBus } from '@/lib/event-bus'
import { t } from '@/i18n'

const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const TouchControls = () => {
  const onInventory = useCallback(() => {
    eventBus.emit('ui:toggle', { panel: 'inventory' })
  }, [])

  const onJournal = useCallback(() => {
    eventBus.emit('ui:toggle', { panel: 'journal' })
  }, [])

  const onMenu = useCallback(() => {
    eventBus.emit('ui:toggle', { panel: 'menu' })
  }, [])

  if (!isTouchDevice()) return null

  return (
    <div style={styles.container}>
      <button type="button" style={styles.button} onClick={onInventory}>
        {t('ui.touch.inventory')}
      </button>
      <button type="button" style={styles.button} onClick={onJournal}>
        {t('ui.touch.journal')}
      </button>
      <button type="button" style={styles.button} onClick={onMenu}>
        {t('ui.touch.menu')}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 56,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 6,
    zIndex: 110,
    pointerEvents: 'auto',
  },
  button: {
    minWidth: 48,
    minHeight: 48,
    padding: '6px 12px',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    fontSize: 11,
    fontFamily: '"Noto Sans KR", sans-serif',
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
}

export default TouchControls
