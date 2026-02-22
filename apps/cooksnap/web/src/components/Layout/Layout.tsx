import { Outlet } from 'react-router-dom'
import classnames from 'classnames/bind'
import Header from '@/components/Header/Header'
import FeedbackButton from '@/components/FeedbackButton/FeedbackButton'
import styles from './Layout.module.scss'

const cx = classnames.bind(styles)

const Layout = () => {
  return (
    <div className={cx('layout')}>
      <Header />
      <main className={cx('main')}>
        <Outlet />
      </main>
      <FeedbackButton />
    </div>
  )
}

export default Layout
