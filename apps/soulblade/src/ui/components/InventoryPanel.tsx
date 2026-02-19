import classnames from 'classnames/bind'
import styles from './InventoryPanel.module.scss'

const cx = classnames.bind(styles)

interface InventoryPanelProps {
  readonly onClose: () => void
}

export const InventoryPanel = ({ onClose }: InventoryPanelProps) => {
  return (
    <div className={cx('panel')}>
      <div className={cx('header')}>
        <h3 className={cx('title')}>인벤토리</h3>
        <button className={cx('closeBtn')} onClick={onClose}>X</button>
      </div>
      <div className={cx('content')}>
        <p className={cx('empty')}>장비 없음</p>
      </div>
    </div>
  )
}
