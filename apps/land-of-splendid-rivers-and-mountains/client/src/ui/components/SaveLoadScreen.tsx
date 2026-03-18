import { useState, useEffect, type CSSProperties } from 'react'
import { t } from '@/i18n'
import { saveManager, type SaveData } from '@/lib/save-manager'
import { api, getUserId } from '@/lib/api'

interface SlotInfo {
  readonly slot: number
  readonly day: number
  readonly season: string
  readonly year: number
  readonly lastSavedAt: string
}

interface Props {
  readonly visible: boolean
  readonly onClose: () => void
  readonly onLoad: () => void
}

const SLOT_COUNT = 3

const SaveLoadScreen = ({ visible, onClose, onLoad }: Props) => {
  const [slots, setSlots] = useState<ReadonlyArray<SlotInfo | null>>([null, null, null])
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    let cancelled = false

    const load = async () => {
      const userId = getUserId()
      if (!userId) {
        if (!cancelled) loadLocalSlotInfo()
        return
      }

      try {
        const serverSlots = await api.get<ReadonlyArray<{ slot: number; version: number; updatedAt: string }>>('/saves')
        if (cancelled) return
        const infos: Array<SlotInfo | null> = [null, null, null]

        for (const s of serverSlots) {
          if (s.slot >= 1 && s.slot <= SLOT_COUNT) {
            try {
              const full = await api.get<{ data: unknown }>(`/saves/${s.slot}`)
              if (cancelled) return
              const data = full.data as Partial<SaveData>
              infos[s.slot - 1] = {
                slot: s.slot,
                day: data.day ?? 1,
                season: data.season ?? 'spring',
                year: data.year ?? 1,
                lastSavedAt: s.updatedAt,
              }
            } catch { /* skip corrupt slot */ }
          }
        }
        if (!cancelled) setSlots(infos)
      } catch {
        if (!cancelled) loadLocalSlotInfo()
      }
    }

    load()
    return () => { cancelled = true }
  }, [visible])

  const loadSlotInfo = async () => {
    const userId = getUserId()
    if (!userId) {
      loadLocalSlotInfo()
      return
    }

    try {
      const serverSlots = await api.get<ReadonlyArray<{ slot: number; version: number; updatedAt: string }>>('/saves')
      const infos: Array<SlotInfo | null> = [null, null, null]

      for (const s of serverSlots) {
        if (s.slot >= 1 && s.slot <= SLOT_COUNT) {
          try {
            const full = await api.get<{ data: unknown }>(`/saves/${s.slot}`)
            const data = full.data as Partial<SaveData>
            infos[s.slot - 1] = {
              slot: s.slot,
              day: data.day ?? 1,
              season: data.season ?? 'spring',
              year: data.year ?? 1,
              lastSavedAt: s.updatedAt,
            }
          } catch { /* skip corrupt slot */ }
        }
      }
      setSlots(infos)
    } catch {
      loadLocalSlotInfo()
    }
  }

  const loadLocalSlotInfo = () => {
    if (saveManager.hasSave()) {
      try {
        const raw = localStorage.getItem('land-of-splendid-rivers-and-mountains:save')
        if (raw) {
          const data = JSON.parse(raw) as Partial<SaveData>
          setSlots([
            {
              slot: 1,
              day: data.day ?? 1,
              season: data.season ?? 'spring',
              year: data.year ?? 1,
              lastSavedAt: data.lastSavedAt ?? '',
            },
            null,
            null,
          ])
          return
        }
      } catch { /* ignore */ }
    }
    setSlots([null, null, null])
  }

  const handleLoad = async (slot: number) => {
    setError(null)
    try {
      saveManager.setSlot(slot)
      const userId = getUserId()
      if (userId) {
        const loaded = await saveManager.loadFromServer(slot)
        if (loaded) {
          onLoad()
          return
        }
      }
      if (slot === 1 && saveManager.load()) {
        onLoad()
        return
      }
      setError(t('ui.saveload.loadFailed'))
    } catch {
      setError(t('ui.saveload.loadFailed'))
    }
  }

  const handleDelete = async (slot: number) => {
    setError(null)
    try {
      const userId = getUserId()
      if (userId) {
        await api.delete(`/saves/${slot}`)
      }
      if (slot === 1) {
        saveManager.deleteSave()
      }
      setConfirmDelete(null)
      loadSlotInfo()
    } catch {
      setError(t('ui.saveload.deleteFailed'))
    }
  }

  if (!visible) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h2 style={styles.title}>{t('ui.saveload.title')}</h2>

        <div style={styles.slotList}>
          {slots.map((info, i) => {
            const slotNum = i + 1
            return (
              <div key={slotNum} style={styles.slot}>
                <div style={styles.slotHeader}>
                  <span style={styles.slotLabel}>{t('ui.saveload.slot')} {slotNum}</span>
                </div>
                {info ? (
                  <>
                    <div style={styles.slotInfo}>
                      <span>{t(`ui.season.${info.season}`)} {t('ui.saveload.year')} {info.year} / {t('ui.saveload.day')} {info.day}</span>
                    </div>
                    <div style={styles.slotActions}>
                      <button style={styles.loadBtn} onClick={() => handleLoad(slotNum)}>
                        {t('ui.saveload.load')}
                      </button>
                      {confirmDelete === slotNum ? (
                        <button style={styles.deleteConfirmBtn} onClick={() => handleDelete(slotNum)}>
                          {t('ui.saveload.confirmDelete')}
                        </button>
                      ) : (
                        <button style={styles.deleteBtn} onClick={() => setConfirmDelete(slotNum)}>
                          {t('ui.saveload.delete')}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={styles.emptySlot}>{t('ui.saveload.empty')}</div>
                )}
              </div>
            )
          })}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.closeBtn} onClick={onClose}>
          {t('ui.saveload.close')}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)',
    zIndex: 510,
    fontFamily: '"Noto Sans KR", sans-serif',
    pointerEvents: 'auto',
  },
  panel: {
    background: 'rgba(20,20,30,0.95)',
    borderRadius: 12,
    padding: 24,
    width: 320,
    maxWidth: '90vw',
  },
  title: {
    fontSize: 20,
    color: '#fbbf24',
    margin: '0 0 16px',
    textAlign: 'center',
  },
  slotList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  slot: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
  },
  slotHeader: {
    marginBottom: 4,
  },
  slotLabel: {
    fontSize: 14,
    color: '#4ade80',
    fontWeight: 'bold',
  },
  slotInfo: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 8,
  },
  slotActions: {
    display: 'flex',
    gap: 8,
  },
  loadBtn: {
    flex: 1,
    padding: '8px 0',
    fontSize: 13,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#fff',
    background: '#4ade80',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#ef4444',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 6,
    cursor: 'pointer',
  },
  deleteConfirmBtn: {
    padding: '8px 12px',
    fontSize: 12,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#fff',
    background: '#ef4444',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  emptySlot: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  error: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  closeBtn: {
    width: '100%',
    padding: '10px 0',
    marginTop: 16,
    fontSize: 14,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#ccc',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    cursor: 'pointer',
  },
}

export default SaveLoadScreen
