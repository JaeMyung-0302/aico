import { useState, useEffect, useCallback } from 'react'
import type { QuestDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import { useGameStore } from '@/stores/useGameStore'
import { eventBus } from '@/lib/event-bus'
import { t } from '@/i18n'
import storyData from '@/game/data/story.json'

const questDefs: ReadonlyArray<QuestDefinition> = storyData as ReadonlyArray<QuestDefinition>

const targetKeyPrefix: Readonly<Record<string, string>> = {
  harvest: 'crop',
  fish: 'fish',
  cook: 'recipe',
  gift: 'npc',
  explore: 'map',
  combat: 'monster',
  talk: 'npc',
  plant: 'crop',
  water: 'crop',
  sell: 'crop',
}

const JournalPanel = () => {
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const { activeQuests, completedQuests, questProgress } = useGameStore()

  useEffect(() => {
    const onAccepted = () => setVisible(true)
    eventBus.on('quest:accepted', onAccepted)
    return () => {
      eventBus.off('quest:accepted', onAccepted)
    }
  }, [])

  const close = useCallback(() => setVisible(false), [])

  if (!visible) return null

  const activeQuestDefs = questDefs.filter((q) => activeQuests.includes(q.id))
  const completedQuestDefs = questDefs.filter((q) => completedQuests.includes(q.id))
  const currentList = tab === 'active' ? activeQuestDefs : completedQuestDefs

  return (
    <div style={styles.overlay} onClick={close}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{t('ui.journal.title')}</span>
          <button type="button" style={styles.closeBtn} onClick={close}>X</button>
        </div>
        <div style={styles.tabs}>
          <button
            type="button"
            style={tab === 'active' ? styles.tabActive : styles.tab}
            onClick={() => setTab('active')}
          >
            {t('ui.journal.active')} ({activeQuests.length})
          </button>
          <button
            type="button"
            style={tab === 'completed' ? styles.tabActive : styles.tab}
            onClick={() => setTab('completed')}
          >
            {t('ui.journal.completed')} ({completedQuests.length})
          </button>
        </div>
        <div style={styles.list}>
          {currentList.length === 0 && (
            <div style={styles.empty}>{t('ui.journal.empty')}</div>
          )}
          {currentList.map((quest) => {
            const progress = questProgress[quest.id] ?? []
            return (
              <div key={quest.id} style={styles.questCard}>
                <div style={styles.questType}>
                  {quest.type === 'prologue' ? t('ui.journal.prologue') : quest.type === 'main' ? t('ui.journal.main') : t('ui.journal.side')}
                </div>
                <div style={styles.questName}>{t(quest.nameKey as never)}</div>
                <div style={styles.questDesc}>{t(quest.descKey as never)}</div>
                {tab === 'active' && quest.requirements.map((req, i) => {
                  const current = progress[i] ?? 0
                  return (
                    <div key={i} style={styles.reqRow}>
                      <span style={styles.reqText}>
                        {t(`quest.req.${req.type}` as never)} {t(`${targetKeyPrefix[req.type] ?? req.type}.${req.target}` as never) || req.target} {current}/{req.quantity}
                      </span>
                      {current >= req.quantity && <span style={styles.checkmark}>✓</span>}
                    </div>
                  )
                })}
                <div style={styles.rewardRow}>
                  {quest.goldReward > 0 && <span style={styles.goldReward}>+{quest.goldReward}G</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)',
    zIndex: 400,
    fontFamily: '"Noto Sans KR", sans-serif',
    pointerEvents: 'auto',
  },
  panel: {
    background: 'linear-gradient(135deg, #2d1b0e, #4a2c17)',
    borderRadius: 12,
    width: 320,
    maxHeight: 500,
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    opacity: 0.7,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    cursor: 'pointer',
  },
  tabActive: {
    flex: 1,
    padding: '8px 0',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px 12px',
  },
  empty: {
    textAlign: 'center' as const,
    fontSize: 12,
    opacity: 0.5,
    padding: 20,
  },
  questCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 8,
  },
  questType: {
    fontSize: 9,
    textTransform: 'uppercase' as const,
    color: '#d97706',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  questName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  questDesc: {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 6,
  },
  reqRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    marginBottom: 2,
  },
  reqText: {
    opacity: 0.8,
  },
  checkmark: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
  rewardRow: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  goldReward: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: 'bold',
  },
}

export default JournalPanel
