import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/useUserStore'
import classNames from 'classnames/bind'
import styles from './HomePage.module.scss'

const cx = classNames.bind(styles)

const HomePage = () => {
  const navigate = useNavigate()
  const { displayName, level, gel } = useUserStore()

  return (
    <div className={cx('container')}>
      <header className={cx('header')}>
        <h1 className={cx('title')}>ElementGuard</h1>
        <p className={cx('subtitle')}>속성 디펜스</p>
      </header>

      <div className={cx('userInfo')}>
        <span className={cx('name')}>{displayName}</span>
        <span className={cx('level')}>Lv.{level}</span>
        <span className={cx('gel')}>{gel} 젤</span>
      </div>

      <nav className={cx('menu')}>
        <button className={cx('menuButton', 'primary')} onClick={() => navigate('/game')}>
          게임 시작
        </button>
        <button className={cx('menuButton')} onClick={() => navigate('/growth')}>
          성장 트리
        </button>
        <button className={cx('menuButton')} onClick={() => navigate('/archive')}>
          도감
        </button>
      </nav>
    </div>
  )
}

export default HomePage
