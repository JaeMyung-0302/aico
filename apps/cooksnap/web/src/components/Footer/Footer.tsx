import classnames from 'classnames/bind'
import styles from './Footer.module.scss'

const cx = classnames.bind(styles)

const Footer = () => {
  return (
    <footer className={cx('footer')}>
      <div className={cx('inner')}>
        <p className={cx('businessName')}>에이코(AICO)</p>
        <div className={cx('info')}>
          <span>대표자: 이재명</span>
          <span>사업자등록번호: 220-17-02629</span>
          <span>주소: 서울특별시 광진구 아차산로 391, 1104호(구의동)</span>
          <span>전화: 010-8828-6712</span>
          <span>이메일: jaemyung123@naver.com</span>
        </div>
        <p className={cx('copyright')}>&copy; {new Date().getFullYear()} AICO. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
