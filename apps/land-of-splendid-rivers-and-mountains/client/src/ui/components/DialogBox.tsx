import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/stores/useGameStore'
import { eventBus } from '@/lib/event-bus'
import { t } from '@/i18n'
import npcsData from '@/game/data/npcs.json'
import dialoguesData from '@/game/data/dialogues.json'
import type { NpcDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

const npcMap = new Map<string, NpcDefinition>(
  (npcsData as ReadonlyArray<NpcDefinition>).map((npc) => [npc.id, npc]),
)

interface DialogueEntry { questId: string; trigger: 'start' | 'complete'; lines: string[] }
const dialogueMap = new Map<string, string[]>(
  (dialoguesData as DialogueEntry[]).map((d) => [`${d.questId}:${d.trigger}`, d.lines]),
)

const DialogBox = () => {
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null)
  const [giftReaction, setGiftReaction] = useState<string | null>(null)
  const [prologueLines, setPrologueLines] = useState<string[]>([])
  const [prologueIndex, setPrologueIndex] = useState(0)
  const [prologueDone, setPrologueDone] = useState<(() => void) | undefined>(undefined)
  const { npcRelations, inventory } = useGameStore()

  const onNpcTalked = useCallback(({ npcId }: { npcId: string }) => {
    setActiveNpcId(npcId)
    setGiftReaction(null)
    useGameStore.getState().setDialogOpen(true)
  }, [])

  const onNpcGifted = useCallback(({ reaction }: { npcId: string; itemId: string; reaction: string }) => {
    setGiftReaction(reaction)
  }, [])

  const onPrologueDialogue = useCallback(({ questId, trigger, onDone }: { questId: string; trigger: 'start' | 'complete'; onDone?: () => void }) => {
    const lines = dialogueMap.get(`${questId}:${trigger}`)
    if (!lines || lines.length === 0) { onDone?.(); return }
    setPrologueLines(lines)
    setPrologueIndex(0)
    setPrologueDone(() => onDone)
    useGameStore.getState().setDialogOpen(true)
  }, [])

  useEffect(() => {
    eventBus.on('npc:talked', onNpcTalked)
    eventBus.on('npc:gifted', onNpcGifted)
    eventBus.on('prologue:dialogue', onPrologueDialogue)
    return () => {
      eventBus.off('npc:talked', onNpcTalked)
      eventBus.off('npc:gifted', onNpcGifted)
      eventBus.off('prologue:dialogue', onPrologueDialogue)
    }
  }, [onNpcTalked, onNpcGifted, onPrologueDialogue])

  // Prologue dialogue takes priority
  if (prologueLines.length > 0) {
    const isLast = prologueIndex >= prologueLines.length - 1
    const handleNext = () => {
      if (isLast) {
        setPrologueLines([])
        setPrologueIndex(0)
        useGameStore.getState().setDialogOpen(false)
        prologueDone?.()
      } else {
        setPrologueIndex((i) => i + 1)
      }
    }
    return (
      <div style={styles.overlay}>
        <div style={styles.box} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <img src="assets/portraits/village-headman.png" alt="이장" style={styles.portrait} />
            <div style={styles.headerInfo}>
              <span style={styles.name}>마을 이장</span>
            </div>
          </div>
          <div style={styles.textArea}>{prologueLines[prologueIndex]}</div>
          <button style={styles.talkBtn} onClick={handleNext}>
            {isLast ? '닫기' : '다음 ▶'}
          </button>
        </div>
      </div>
    )
  }

  if (!activeNpcId) return null

  const npcDef = npcMap.get(activeNpcId)
  if (!npcDef) return null

  const npcName = t(npcDef.nameKey)
  const relation = npcRelations[activeNpcId] ?? 0

  const giftableItems = inventory.filter((slot) => {
    if (!slot) return false
    return slot.itemId.startsWith('crop-') || slot.itemId.startsWith('material-')
  })

  const handleGift = (itemId: string) => {
    eventBus.emit('npc:giftRequested', { npcId: activeNpcId, itemId })
  }

  const handleClose = () => {
    setActiveNpcId(null)
    setGiftReaction(null)
    useGameStore.getState().setDialogOpen(false)
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.box} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <img
            src={`assets/portraits/${activeNpcId}.png`}
            alt={npcName}
            style={styles.portrait}
          />
          <div style={styles.headerInfo}>
            <span style={styles.name}>{npcName}</span>
            <span style={styles.heart}>{'♥'.repeat(Math.min(5, Math.max(0, relation)))}</span>
          </div>
        </div>
        <div style={styles.textArea}>
          {giftReaction
            ? t(`npc.gift.${giftReaction}`)
            : t('ui.dialog.greeting')}
        </div>
        {giftableItems.length > 0 && (
          <div style={styles.giftSection}>
            <div style={styles.giftLabel}>{t('ui.dialog.gift')}</div>
            <div style={styles.giftList}>
              {giftableItems.map((slot, idx) => {
                if (!slot) return null
                return (
                  <button
                    key={`${slot.itemId}-${idx}`}
                    style={styles.giftBtn}
                    onClick={() => handleGift(slot.itemId)}
                  >
                    {t(`item.${slot.itemId.replace('-', '.')}`)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <button style={styles.talkBtn} onClick={handleClose}>
          {t('ui.dialog.close')}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 60,
    zIndex: 200,
    pointerEvents: 'auto',
  },
  box: {
    width: '90%',
    maxWidth: 400,
    background: 'rgba(20,20,30,0.95)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  portrait: {
    width: 48,
    height: 48,
    borderRadius: 6,
    border: '2px solid rgba(255,255,255,0.2)',
    objectFit: 'cover' as const,
    background: '#fff',
  },
  headerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  heart: {
    fontSize: 10,
    color: '#ef4444',
  },
  textArea: {
    fontSize: 12,
    lineHeight: '1.5',
    color: '#ddd',
    padding: '8px 4px',
    minHeight: 40,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  giftSection: {
    marginBottom: 8,
  },
  giftLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  giftList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  giftBtn: {
    padding: '3px 8px',
    border: 'none',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.1)',
    color: '#ddd',
    fontSize: 10,
    cursor: 'pointer',
  },
  talkBtn: {
    width: '100%',
    padding: '6px 0',
    border: 'none',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
}

export default DialogBox
