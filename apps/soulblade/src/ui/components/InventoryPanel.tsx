import classnames from 'classnames/bind'
import styles from './InventoryPanel.module.scss'

const cx = classnames.bind(styles)

export const InventoryPanel = () => {
  return (
    <div className={cx('content')}>
      <p className={cx('empty')}>장비 없음</p>
    </div>
  )
}
