import classnames from 'classnames/bind'
import type { MapId } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import styles from './PortalModal.module.scss'

const cx = classnames.bind(styles)

interface PortalModalProps {
  readonly targetMapId: MapId
  readonly label: string
  readonly recommendedLevel: number
  readonly onClose: () => void
}

export const PortalModal = ({
  targetMapId,
  label,
  recommendedLevel,
  onClose,
}: PortalModalProps) => {
  const handleConfirm = () => {
    eventBus.emit('portal:confirm', { targetMapId })
    onClose()
  }

  const handleCancel = () => {
    eventBus.emit('portal:cancel')
    onClose()
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <h2 className={cx('title')}>{label}</h2>
        <p className={cx('subtitle')}>
          이동하시겠습니까? (추천 Lv.{recommendedLevel})
        </p>
        <div className={cx('buttons')}>
          <button className={cx('confirmBtn')} onClick={handleConfirm}>
            이동
          </button>
          <button className={cx('cancelBtn')} onClick={handleCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
