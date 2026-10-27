import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { COLORS, type ColorToken } from '../tokens/colors'

// 시안(SCR-01·02·03·16·18)의 stroke 아이콘 (viewBox 24, 선 1.7)
export type IconName =
  | 'home'
  | 'timeline'
  | 'album'
  | 'map'
  | 'settings'
  | 'back'
  | 'chevronRight'
  | 'plus'
  | 'heart'
  | 'alert'
  | 'lock'
  | 'file'
  | 'calendar'
  | 'share'
  | 'close'

type IconProps = {
  name: IconName
  size?: number
  color?: ColorToken
  strokeWidth?: number
}

const HEART =
  'M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.9 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.3 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20z'
const SETTINGS = 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1'

const Icon = ({ name, size = 22, color = 'ink', strokeWidth = 1.7 }: IconProps) => {
  const common = {
    stroke: COLORS[color],
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'home' ? (
        <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" {...common} />
      ) : null}
      {name === 'timeline' ? <Path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" {...common} /> : null}
      {name === 'album' ? (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={1.5} {...common} />
          <Rect x={14} y={3} width={7} height={7} rx={1.5} {...common} />
          <Rect x={3} y={14} width={7} height={7} rx={1.5} {...common} />
          <Rect x={14} y={14} width={7} height={7} rx={1.5} {...common} />
        </>
      ) : null}
      {name === 'map' ? (
        <>
          <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" {...common} />
          <Circle cx={12} cy={9.5} r={2.5} {...common} />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path d={SETTINGS} {...common} />
        </>
      ) : null}
      {name === 'back' ? <Path d="m15 6-6 6 6 6" {...common} /> : null}
      {name === 'chevronRight' ? <Path d="m9 6 6 6-6 6" {...common} /> : null}
      {name === 'plus' ? <Path d="M12 5v14M5 12h14" {...common} /> : null}
      {name === 'heart' ? <Path d={HEART} {...common} /> : null}
      {name === 'alert' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M12 7.5v5.5M12 16.5v.01" {...common} />
        </>
      ) : null}
      {name === 'lock' ? (
        <>
          <Rect x={5} y={11} width={14} height={10} rx={2} {...common} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...common} />
        </>
      ) : null}
      {name === 'file' ? (
        <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" {...common} />
      ) : null}
      {name === 'calendar' ? (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2} {...common} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...common} />
        </>
      ) : null}
      {name === 'share' ? <Path d="M12 15V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" {...common} /> : null}
      {name === 'close' ? <Path d="M6 6l12 12M18 6 6 18" {...common} /> : null}
    </Svg>
  )
}

export default Icon
