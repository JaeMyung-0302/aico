import { useState } from 'react'
import classnames from 'classnames/bind'
import styles from './Footer.module.scss'

const cx = classnames.bind(styles)

const Footer = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <footer className={cx('footer')}>
      <div className={cx('inner')}>
        <div className={cx('links')}>
          <span className={cx('link')}>이용약관</span>
          <span className={cx('divider')}>|</span>
          <span className={cx('link', 'bold')}>개인정보처리방침</span>
        </div>

        <button
          className={cx('toggle')}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="business-info"
        >
          에이코(AICO) 사업자 정보
          <span className={cx('arrow', { open: isOpen })}>›</span>
        </button>

        {isOpen && (
          <div id="business-info" role="region" className={cx('businessDetail')}>
            <span>대표자: 이재명</span>
            <span className={cx('sep')}>·</span>
            <span>사업자등록번호: 220-17-02629</span>
            <span className={cx('sep')}>·</span>
            <span>주소: 서울특별시 광진구 아차산로 391, 에뗴르넬비욘드</span>
            <span className={cx('sep')}>·</span>
            <span>전화: 010-8828-6712</span>
            <span className={cx('sep')}>·</span>
            <span>이메일: jaemyung123@naver.com</span>
          </div>
        )}

        <p className={cx('copyright')}>&copy; {new Date().getFullYear()} AICO. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
