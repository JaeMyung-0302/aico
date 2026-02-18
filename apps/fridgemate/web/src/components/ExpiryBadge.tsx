import classNames from 'classnames/bind'
import { ExpiryStatus, getDaysUntilExpiry, getExpiryStatus } from '@/types'
import styles from './ExpiryBadge.module.scss'

const cx = classNames.bind(styles)

interface ExpiryBadgeProps {
  expiryDate: string | null
}

const STATUS_STYLE_MAP: Record<ExpiryStatus, string> = {
  [ExpiryStatus.SAFE]: 'safe',
  [ExpiryStatus.WARNING]: 'warning',
  [ExpiryStatus.DANGER]: 'danger',
  [ExpiryStatus.EXPIRED]: 'expired',
}

const getDisplayText = (expiryDate: string | null): string => {
  if (!expiryDate) return '기한 없음'

  const days = getDaysUntilExpiry(expiryDate)
  if (days === null) return '기한 없음'
  if (days <= 0) return '만료됨'
  return `D-${days}`
}

export const ExpiryBadge = ({ expiryDate }: ExpiryBadgeProps) => {
  const status = getExpiryStatus(expiryDate)
  const styleClass = STATUS_STYLE_MAP[status]
  const text = getDisplayText(expiryDate)

  return <span className={cx('badge', styleClass)}>{text}</span>
}
