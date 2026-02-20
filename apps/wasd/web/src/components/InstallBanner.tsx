import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import styles from './InstallBanner.module.scss'
import classNames from 'classnames/bind'

const cx = classNames.bind(styles)

const InstallBanner = () => {
  const { isVisible, install, dismiss } = useInstallPrompt()

  if (!isVisible) return null

  return (
    <div className={cx('banner')}>
      <span className={cx('text')}>앱으로 설치하면 더 빠르게 플레이!</span>
      <div className={cx('actions')}>
        <button className={cx('install')} onClick={install}>
          설치
        </button>
        <button className={cx('dismiss')} onClick={dismiss}>
          닫기
        </button>
      </div>
    </div>
  )
}

export default InstallBanner
