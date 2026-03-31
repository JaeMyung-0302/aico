import { Link } from 'react-router-dom'
import classnames from 'classnames/bind'
import styles from './PrivacyPage.module.scss'

const cx = classnames.bind(styles)

export const PrivacyPage = () => {
  return (
    <div className={cx('legal')}>
      <Link to="/" className={cx('back')}>&larr; 홈으로</Link>
      <h1>개인정보처리방침</h1>
      <p className={cx('updated')}>최종 수정일: 2026년 3월 31일</p>

      <h2>1. 개인정보의 수집 항목 및 수집 방법</h2>
      <p>에이코(AICO)는 FridgeMate 서비스 제공을 위해 다음 개인정보를 수집합니다.</p>
      <ul>
        <li><strong>수집 항목:</strong> 이메일 주소, 비밀번호 (암호화 저장), 닉네임</li>
        <li><strong>수집 방법:</strong> 회원가입 시 직접 입력</li>
      </ul>

      <h2>2. 개인정보의 수집 및 이용 목적</h2>
      <ul>
        <li>서비스 회원 식별 및 인증</li>
        <li>냉장고 재료 관리 데이터 저장</li>
        <li>그룹 공유 기능 제공</li>
        <li>유통기한 알림 발송</li>
      </ul>

      <h2>3. 개인정보의 보유 및 이용 기간</h2>
      <p>회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>

      <h2>4. 개인정보의 파기</h2>
      <p>보유 기간 경과 또는 처리 목적 달성 후 지체 없이 파기합니다.</p>

      <h2>5. 제3자 제공</h2>
      <p>회사는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법률에 특별한 규정이 있는 경우 예외로 합니다.</p>

      <h2>6. 정보주체의 권리</h2>
      <ul>
        <li>개인정보 열람, 정정, 삭제, 처리정지 요청</li>
        <li>회원 탈퇴를 통한 개인정보 삭제</li>
        <li>이메일(jaemyung123@naver.com)로 요청할 수 있습니다.</li>
      </ul>

      <h2>7. 개인정보 보호책임자</h2>
      <p>성명: 이재명<br />이메일: jaemyung123@naver.com<br />전화: 010-8828-6712</p>
    </div>
  )
}
