import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import classNames from 'classnames/bind'
import { BottomNav } from '@/components/BottomNav'
import styles from './Layout.module.scss'

const cx = classNames.bind(styles)

export const Layout = () => {
  return (
    <div className={cx('layout')}>
      <header className={cx('header')}>FridgeMate</header>
      <main className={cx('content')}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
