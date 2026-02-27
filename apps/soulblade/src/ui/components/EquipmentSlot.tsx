import classnames from 'classnames/bind'
import type {
  Equipment,
  EquipmentType,
  EquipmentGrade,
} from '@soulblade/shared'
import styles from './EquipmentSlot.module.scss'

const cx = classnames.bind(styles)

interface EquipmentSlotProps {
  readonly slotType: EquipmentType
  readonly item: Equipment | undefined
  readonly onTap: (slotType: EquipmentType) => void
}

const GRADE_COLORS: Record<EquipmentGrade, string> = {
  common: '#9e9e9e',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800',
}

const SLOT_LABELS: Record<EquipmentType, string> = {
  weapon: '무기',
  armor: '갑옷',
  accessory: '장신구',
}

export const EquipmentSlot = ({
  slotType,
  item,
  onTap,
}: EquipmentSlotProps) => {
  const handleClick = () => onTap(slotType)

  return (
    <button
      className={cx('slot', { equipped: !!item, [item?.grade ?? '']: !!item })}
      onClick={handleClick}
      style={item ? { borderColor: GRADE_COLORS[item.grade] } : undefined}
    >
      {item ? (
        <>
          <span
            className={cx('name')}
            style={{ color: GRADE_COLORS[item.grade] }}
          >
            {item.name}
          </span>
          <span className={cx('tags')}>
            {item.tags.map((tag) => (
              <span key={tag} className={cx('tag')}>
                {tag}
              </span>
            ))}
          </span>
          <span className={cx('stats')}>
            {Object.entries(item.stats).map(([key, val]) => (
              <span key={key} className={cx('stat')}>
                {key.toUpperCase()} +{val}
              </span>
            ))}
          </span>
        </>
      ) : (
        <span className={cx('empty')}>{SLOT_LABELS[slotType]}</span>
      )}
    </button>
  )
}
