import classnames from 'classnames/bind'
import styles from './Loading.module.scss'

const cx = classnames.bind(styles)

export interface LoadingProps {
  loading?: boolean
  message?: string
  fullPage?: boolean
  overlay?: boolean
}

const Loading = ({
  loading,
  message,
  fullPage = false,
  overlay = false,
}: LoadingProps) => {
  if (overlay && !loading) return null

  return (
    <div
      className={cx({
        backdrop: overlay,
        container: !overlay,
        fullPage: !overlay && fullPage,
      })}
    >
      <div className={cx('dots')}>
        <div className={cx('dot')} />
        <div className={cx('dot')} />
        <div className={cx('dot')} />
      </div>
      {message && <p className={cx('message')}>{message}</p>}
    </div>
  )
}

export default Loading
