import { FridgeType } from '@/types'

interface FridgeTypeIconProps {
  type: FridgeType
  size?: number
}

// 1도어: 단문 냉장고
const OneDoor = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect
      x="10"
      y="4"
      width="28"
      height="40"
      rx="4"
      fill="#c8d0dc"
      stroke="#a0a8b8"
      strokeWidth="1.5"
    />
    <rect x="33" y="16" width="2" height="14" rx="1" fill="#8890a0" />
    <rect
      x="12"
      y="6"
      width="24"
      height="36"
      rx="2"
      fill="#e8edf5"
      opacity="0.6"
    />
  </svg>
)

// 2도어: 상단 냉장 + 하단 냉동
const TwoDoor = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect
      x="10"
      y="4"
      width="28"
      height="40"
      rx="4"
      fill="#c8d0dc"
      stroke="#a0a8b8"
      strokeWidth="1.5"
    />
    <line x1="10" y1="26" x2="38" y2="26" stroke="#a0a8b8" strokeWidth="1" />
    <rect x="33" y="12" width="2" height="8" rx="1" fill="#8890a0" />
    <rect x="33" y="30" width="2" height="8" rx="1" fill="#8890a0" />
    <rect
      x="12"
      y="6"
      width="24"
      height="18"
      rx="2"
      fill="#e8edf5"
      opacity="0.6"
    />
    <rect
      x="12"
      y="28"
      width="24"
      height="14"
      rx="2"
      fill="#d4eaf8"
      opacity="0.6"
    />
  </svg>
)

// 양문형 (삼성): 좌우 대칭 2문
const SideBySide = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect
      x="8"
      y="4"
      width="32"
      height="40"
      rx="4"
      fill="#c8d0dc"
      stroke="#a0a8b8"
      strokeWidth="1.5"
    />
    <line x1="24" y1="6" x2="24" y2="42" stroke="#a0a8b8" strokeWidth="1.2" />
    <rect
      x="10"
      y="6"
      width="12"
      height="36"
      rx="2"
      fill="#d4eaf8"
      opacity="0.5"
    />
    <rect
      x="26"
      y="6"
      width="12"
      height="36"
      rx="2"
      fill="#e8edf5"
      opacity="0.5"
    />
    <rect x="21" y="14" width="2" height="12" rx="1" fill="#8890a0" />
    <rect x="25" y="14" width="2" height="12" rx="1" fill="#8890a0" />
    <text
      x="16"
      y="16"
      fontSize="5"
      fill="#7090b0"
      textAnchor="middle"
      fontWeight="600"
    >
      ❄
    </text>
    <text
      x="32"
      y="16"
      fontSize="5"
      fill="#70a070"
      textAnchor="middle"
      fontWeight="600"
    >
      🌿
    </text>
  </svg>
)

// 4도어: 상단 좌측 냉동 + 우측 냉장 + 하단 김치칸 2단
const FourDoor = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="8" y="4" width="32" height="40" rx="4" fill="#c8d0dc" stroke="#a0a8b8" strokeWidth="1.5" />
    <line x1="24" y1="6" x2="24" y2="24" stroke="#a0a8b8" strokeWidth="1" />
    <line x1="8" y1="25" x2="40" y2="25" stroke="#a0a8b8" strokeWidth="1.2" />
    <line x1="10" y1="34" x2="38" y2="34" stroke="#a0a8b8" strokeWidth="0.8" />
    <rect x="10" y="6" width="12" height="17" rx="2" fill="#d4eaf8" opacity="0.5" />
    <rect x="26" y="6" width="12" height="17" rx="2" fill="#e8edf5" opacity="0.5" />
    <rect x="10" y="27" width="28" height="5.5" rx="2" fill="#e8f0e0" opacity="0.5" />
    <rect x="10" y="36" width="28" height="6" rx="2" fill="#e8f0e0" opacity="0.5" />
    <rect x="21" y="11" width="2" height="6" rx="1" fill="#8890a0" />
    <rect x="25" y="11" width="2" height="6" rx="1" fill="#8890a0" />
    <rect x="20" y="28.5" width="8" height="1.5" rx="0.75" fill="#8890a0" />
    <rect x="20" y="37.5" width="8" height="1.5" rx="0.75" fill="#8890a0" />
  </svg>
)

const ICON_MAP: Record<FridgeType, React.FC<{ size: number }>> = {
  [FridgeType.ONE_DOOR]: OneDoor,
  [FridgeType.TWO_DOOR]: TwoDoor,
  [FridgeType.SIDE_BY_SIDE]: SideBySide,
  [FridgeType.FOUR_DOOR]: FourDoor,
}

export const FridgeTypeIcon = ({ type, size = 48 }: FridgeTypeIconProps) => {
  const Icon = ICON_MAP[type]
  return <Icon size={size} />
}
