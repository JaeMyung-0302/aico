import { useGameStore } from '@/stores/useGameStore'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { t } from '@/i18n'
import npcsData from '@/game/data/npcs.json'
import type { NpcDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

const allNpcs = npcsData as ReadonlyArray<NpcDefinition>

const RELATION_RANGE = GAME_CONSTANTS.NPC_RELATION_MAX - GAME_CONSTANTS.NPC_RELATION_MIN

interface Props {
  readonly open: boolean
}

const NPCPanel = ({ open }: Props) => {
  const { npcRelations } = useGameStore()

  const knownNpcs = allNpcs.filter((npc) => npc.id in npcRelations)

  if (!open) return null

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t('ui.npc.title')}</div>
      {knownNpcs.length === 0 ? (
        <div style={styles.empty}>{t('ui.npc.empty')}</div>
      ) : (
        <div style={styles.list}>
          {knownNpcs.map((npc) => {
            const relation = npcRelations[npc.id] ?? 0
            const percent = ((relation - GAME_CONSTANTS.NPC_RELATION_MIN) / RELATION_RANGE) * 100

            return (
              <div key={npc.id} style={styles.row}>
                <span style={styles.npcName}>{t(npc.nameKey)}</span>
                <div style={styles.barBg}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${percent}%`,
                      backgroundColor: relation >= 5 ? '#4ade80' : relation >= 0 ? '#fbbf24' : '#ef4444',
                    }}
                  />
                </div>
                <span style={styles.relationText}>{relation}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 50,
    right: 8,
    bottom: 52,
    width: 200,
    background: 'rgba(20,20,30,0.92)',
    borderRadius: 10,
    padding: 10,
    zIndex: 120,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
  },
  npcName: {
    fontSize: 11,
    color: '#ddd',
    minWidth: 50,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  barBg: {
    flex: 1,
    height: 6,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  relationText: {
    fontSize: 10,
    color: '#aaa',
    minWidth: 18,
    textAlign: 'right' as const,
  },
  empty: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center' as const,
    padding: 16,
  },
}

export default NPCPanel
