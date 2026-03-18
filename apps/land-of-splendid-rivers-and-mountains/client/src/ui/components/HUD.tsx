import { useGameStore } from '@/stores/useGameStore'
import { t } from '@/i18n'
import MiniMap from './MiniMap'

const SEASON_COLORS: Readonly<Record<string, string>> = {
  spring: '#4ade80',
  summer: '#facc15',
  autumn: '#f97316',
  winter: '#60a5fa',
}

const WEATHER_ICONS: Readonly<Record<string, string>> = {
  clear: '\u2600',
  rain: '\uD83C\uDF27',
  snow: '\u2744',
  storm: '\u26C8',
  fog: '\uD83C\uDF2B',
}

const formatTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours >= 12 ? t('ui.time.pm') : t('ui.time.am')
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${period} ${displayHours}:${String(minutes).padStart(2, '0')}`
}

const SEASON_MONTH_OFFSET: Readonly<Record<string, number>> = {
  spring: 0,
  summer: 3,
  autumn: 6,
  winter: 9,
}

const getMonth = (season: string, day: number): { month: number; dayOfMonth: number } => {
  const offset = SEASON_MONTH_OFFSET[season] ?? 0
  const monthIndex = Math.floor((day - 1) / 10)
  const month = offset + monthIndex + 1
  const dayOfMonth = ((day - 1) % 10) + 1
  return { month, dayOfMonth }
}

const HUD = () => {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const day = useGameStore((s) => s.day)
  const season = useGameStore((s) => s.season)
  const year = useGameStore((s) => s.year)
  const weather = useGameStore((s) => s.weather)
  const energy = useGameStore((s) => s.energy)
  const maxEnergy = useGameStore((s) => s.maxEnergy)
  const playerHp = useGameStore((s) => s.playerHp)
  const playerMaxHp = useGameStore((s) => s.playerMaxHp)
  const energyPercent = Math.round((energy / maxEnergy) * 100)
  const { month, dayOfMonth } = getMonth(season, day)
  const seasonColor = SEASON_COLORS[season] ?? '#fff'
  const weatherIcon = WEATHER_ICONS[weather] ?? ''

  const hpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 0
  const hpColor = hpRatio > 0.5 ? '#e44' : hpRatio > 0.25 ? '#e80' : '#f00'

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        {/* Left: HP + Energy bars */}
        <div style={styles.leftCol}>
          {playerMaxHp > 0 && (
            <div style={styles.barRow}>
              <span style={{ ...styles.barLabel, color: '#ff6666' }}>HP</span>
              <div style={styles.barBg}>
                <div style={{ ...styles.barFill, width: `${Math.max(0, hpRatio * 100)}%`, backgroundColor: hpColor }} />
              </div>
              <span style={styles.barText}>{playerHp}/{playerMaxHp}</span>
            </div>
          )}
          <div style={styles.barRow}>
            <span style={{ ...styles.barLabel, color: '#4ade80' }}>EP</span>
            <div style={styles.barBg}>
              <div style={{ ...styles.barFill, width: `${energyPercent}%`, backgroundColor: energyPercent > 30 ? '#4ade80' : energyPercent > 15 ? '#facc15' : '#ef4444' }} />
            </div>
            <span style={styles.barText}>{energy}/{maxEnergy}</span>
          </div>
        </div>

        {/* Center: Date & Time */}
        <div style={styles.centerCol}>
          <div style={styles.clockText}>{formatTime(timeOfDay)}</div>
          <div style={styles.dateRow}>
            <span style={styles.dateText}>{year}년 {month}월 {dayOfMonth}일</span>
            <span style={{ ...styles.seasonBadge, backgroundColor: seasonColor }}>
              {t(`ui.season.${season}`)}
            </span>
          </div>
          <div style={styles.weatherText}>
            {weatherIcon} {t(`ui.weather.${weather}`)}
          </div>
        </div>

        {/* Right: MiniMap */}
        <MiniMap />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
    fontFamily: '"Noto Sans KR", sans-serif',
    zIndex: 100,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '6px 8px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 85%, transparent 100%)',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 5,
    minWidth: 140,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 18,
    textAlign: 'right' as const,
  },
  barBg: {
    width: 90,
    height: 10,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.3s ease',
  },
  barText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    minWidth: 40,
  },
  centerCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 1,
  },
  clockText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: '0.5px',
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  seasonBadge: {
    fontSize: 8,
    color: '#000',
    fontWeight: 'bold',
    padding: '0px 5px',
    borderRadius: 6,
  },
  weatherText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
  },
}

export default HUD
