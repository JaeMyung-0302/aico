import classNames from 'classnames/bind'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import styles from './InstallBanner.module.scss'

const cx = classNames.bind(styles)

export const InstallBanner = () => {
  const { isVisible, install, dismiss } = useInstallPrompt()

  if (!isVisible) return null

  return (
    <div className={cx('banner')}>
      <div className={cx('content')}>
        <div className={cx('icon')}>
          <img src="/icons/icon-192x192.png" alt="FridgeMate" width={40} height={40} />
        </div>
        <div className={cx('text')}>
          <span className={cx('title')}>FridgeMate 앱 설치</span>
          <span className={cx('desc')}>홈 화면에 추가하면 더 빠르게 사용할 수 있어요</span>
        </div>
      </div>
      <div className={cx('actions')}>
        <button className={cx('dismissBtn')} onClick={dismiss} type="button">
          나중에
        </button>
        <button className={cx('installBtn')} onClick={install} type="button">
          설치
        </button>
      </div>
    </div>
  )
}
