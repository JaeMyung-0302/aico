import classnames from 'classnames/bind'
import styles from './LoadingScreen.module.scss'

const cx = classnames.bind(styles)

interface LoadingScreenProps {
  readonly message?: string
}

export const LoadingScreen = ({ message = 'Loading...' }: LoadingScreenProps) => (
  <div className={cx('loading')}>
    <h1 className={cx('title')}>SoulBlade</h1>
    <p className={cx('subtitle')}>영혼의 전장</p>
    <div className={cx('spinner')} />
    <p className={cx('message')}>{message}</p>
  </div>
)
