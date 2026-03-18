import { useGameStore } from '@/stores/useGameStore'
import { t } from '@/i18n'

interface SceneNode {
  readonly key: string
  readonly label: string
  readonly color: string
  readonly row: number
  readonly col: number
}

const SCENES: ReadonlyArray<SceneNode> = [
  { key: 'MarketScene', label: 'map.market', color: '#c9956b', row: 0, col: 0 },
  { key: 'DungeonScene', label: 'map.dungeon', color: '#8a7d72', row: 0, col: 1 },
  { key: 'FarmScene', label: 'map.farm', color: '#5db86c', row: 1, col: 0 },
  { key: 'VillageScene', label: 'map.village', color: '#e8a840', row: 1, col: 1 },
  { key: 'RiverScene', label: 'map.river', color: '#4a9ee0', row: 1, col: 2 },
  { key: 'TempleScene', label: 'map.temple', color: '#9b7dd4', row: 2, col: 1 },
  { key: 'BeachScene', label: 'map.beach', color: '#e8c94a', row: 2, col: 2 },
]

const CONNECTIONS: ReadonlyArray<[string, string]> = [
  ['MarketScene', 'FarmScene'],
  ['FarmScene', 'VillageScene'],
  ['VillageScene', 'DungeonScene'],
  ['VillageScene', 'RiverScene'],
  ['VillageScene', 'TempleScene'],
  ['RiverScene', 'BeachScene'],
]

const CELL = 26
const GAP = 4
const COLS = 3
const ROWS = 3
const PAD = 3

const gridWidth = COLS * CELL + (COLS - 1) * GAP + PAD * 2
const gridHeight = ROWS * CELL + (ROWS - 1) * GAP + PAD * 2

const getCenter = (row: number, col: number) => ({
  x: PAD + col * (CELL + GAP) + CELL / 2,
  y: PAD + row * (CELL + GAP) + CELL / 2,
})

const sceneMap = new Map(SCENES.map((s) => [s.key, s]))

const MiniMap = () => {
  const currentScene = useGameStore((s) => s.currentScene)

  const fallbackLabel = (key: string) => key.replace('Scene', '')

  return (
    <div style={styles.container}>
      <svg width={gridWidth} height={gridHeight} style={styles.svg}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {CONNECTIONS.map(([from, to]) => {
          const a = sceneMap.get(from)
          const b = sceneMap.get(to)
          if (!a || !b) return null
          const ca = getCenter(a.row, a.col)
          const cb = getCenter(b.row, b.col)
          const isActive = from === currentScene || to === currentScene
          return (
            <line
              key={`${from}-${to}`}
              x1={ca.x}
              y1={ca.y}
              x2={cb.x}
              y2={cb.y}
              stroke={isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'}
              strokeWidth={1.5}
              strokeDasharray={isActive ? 'none' : '2 2'}
            />
          )
        })}

        {SCENES.map((scene) => {
          const isCurrent = scene.key === currentScene
          const x = PAD + scene.col * (CELL + GAP)
          const y = PAD + scene.row * (CELL + GAP)
          const label = t(scene.label) || fallbackLabel(scene.key)

          return (
            <g key={scene.key} filter={isCurrent ? 'url(#glow)' : undefined}>
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={5}
                fill={scene.color}
                opacity={isCurrent ? 1 : 0.3}
                stroke={isCurrent ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={isCurrent ? 1.5 : 0.5}
              />
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isCurrent ? '#fff' : 'rgba(255,255,255,0.55)'}
                fontSize={7}
                fontWeight={isCurrent ? 'bold' : 'normal'}
                fontFamily="'Noto Sans KR', sans-serif"
              >
                {label}
              </text>
              {isCurrent && (
                <circle
                  cx={x + CELL - 4}
                  cy={y + 4}
                  r={2}
                  fill="#4ade80"
                >
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, rgba(20,25,40,0.75), rgba(10,15,25,0.85))',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    padding: 0,
    backdropFilter: 'blur(4px)',
  },
  svg: {
    display: 'block',
  },
}

export default MiniMap
