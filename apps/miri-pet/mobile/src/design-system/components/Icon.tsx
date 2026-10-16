import Svg, { Circle, Path } from 'react-native-svg'
import { COLORS, type ColorToken } from '../tokens/colors'

// 디자인 시안의 stroke 아이콘 (viewBox 24)
export type IconName =
  | 'home'
  | 'pin'
  | 'chat'
  | 'paw'
  | 'bell'
  | 'plus'
  | 'back'
  | 'more'
  | 'check'
  | 'chevronRight'
  | 'flag'
  | 'block'
  | 'user'
  | 'heart'
  | 'heartFilled'
  | 'close'
  | 'camera'
  | 'calendar'
  | 'send'

type IconProps = {
  name: IconName
  size?: number
  color?: ColorToken
}

const PAW =
  'M8.5 17.6c0-2.6 2-5.1 4.4-5.1s4.4 2.5 4.4 5.1c0 1.6-1.3 2.4-2.8 2.4-1 0-1.1-.5-1.6-.5s-.6.5-1.6.5c-1.5 0-2.8-.8-2.8-2.4z'

const HEART =
  'M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.9 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.1 0 5.3 3 4.2 6.2C19.5 15.4 12 20 12 20z'

const Icon = ({ name, size = 24, color = 'ink' }: IconProps) => {
  const stroke = COLORS[color]
  const common = {
    stroke,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'home' ? <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...common} /> : null}
      {name === 'pin' ? (
        <>
          <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" {...common} />
          <Circle cx={12} cy={9.5} r={2.5} {...common} />
        </>
      ) : null}
      {name === 'chat' ? <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" {...common} /> : null}
      {name === 'paw' ? (
        <>
          <Circle cx={6.5} cy={10} r={1.8} {...common} />
          <Circle cx={10.5} cy={6.2} r={1.8} {...common} />
          <Circle cx={15.5} cy={6.6} r={1.8} {...common} />
          <Circle cx={18.8} cy={11} r={1.8} {...common} />
          <Path d={PAW} {...common} />
        </>
      ) : null}
      {name === 'bell' ? (
        <>
          <Path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" {...common} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...common} />
        </>
      ) : null}
      {name === 'send' ? <Path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" {...common} /> : null}
      {name === 'plus' ? <Path d="M12 5v14M5 12h14" {...common} /> : null}
      {name === 'back' ? <Path d="M15 5l-7 7 7 7" {...common} /> : null}
      {name === 'more' ? <Path d="M5 12h.01M12 12h.01M19 12h.01" {...common} strokeWidth={3.2} /> : null}
      {name === 'check' ? <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} strokeWidth={2.4} /> : null}
      {name === 'chevronRight' ? <Path d="M9 5l7 7-7 7" {...common} /> : null}
      {name === 'flag' ? <Path d="M5 21V4h11l-1.5 4L16 12H5" {...common} /> : null}
      {name === 'block' ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Path d="M6 6l12 12" {...common} />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <Circle cx={12} cy={8} r={4} {...common} />
          <Path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" {...common} />
        </>
      ) : null}
      {name === 'heart' ? <Path d={HEART} {...common} /> : null}
      {name === 'heartFilled' ? <Path d={HEART} {...common} fill={stroke} /> : null}
      {name === 'close' ? <Path d="M6 6l12 12M18 6L6 18" {...common} /> : null}
      {name === 'calendar' ? <Path d="M3.5 5h17v15h-17zM3.5 10h17M8 3v4M16 3v4" {...common} /> : null}
      {name === 'camera' ? (
        <>
          <Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...common} />
          <Circle cx={12} cy={13} r={3.5} {...common} />
        </>
      ) : null}
    </Svg>
  )
}

export default Icon
