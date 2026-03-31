import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import styles from './PrivacyPage.module.scss'

const cx = classnames.bind(styles)

const PrivacyPage = () => {
  return (
    <div className={cx('privacy')}>
      <Helmet>
        <title>개인정보처리방침 - CookSnap</title>
        <meta name="description" content="CookSnap 개인정보처리방침" />
        <link rel="canonical" href="https://cooksnap.aico-app.com/privacy" />
      </Helmet>

      <h1>개인정보처리방침</h1>
      <p className={cx('updated')}>최종 수정일: 2026년 3월 31일</p>

      <h2>1. 개인정보의 수집 항목 및 수집 방법</h2>
      <p>
        에이코(AICO, 이하 &quot;회사&quot;)는 CookSnap 서비스 제공을 위해 다음
        개인정보를 수집합니다.
      </p>
      <ul>
        <li>
          <strong>수집 항목:</strong> 이메일 주소, 이름, 프로필 이미지 (Google
          OAuth 로그인 시 제공)
        </li>
        <li>
          <strong>수집 방법:</strong> Google 계정 연동 로그인
        </li>
      </ul>

      <h2>2. 개인정보의 수집 및 이용 목적</h2>
      <ul>
        <li>서비스 회원 식별 및 인증</li>
        <li>레시피 분석 이력 관리</li>
        <li>프리미엄 구독 결제 처리</li>
        <li>서비스 개선 및 이용 통계</li>
      </ul>

      <h2>3. 개인정보의 보유 및 이용 기간</h2>
      <p>
        회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우
        해당 기간 동안 보관합니다.
      </p>
      <ul>
        <li>전자상거래 등의 거래기록: 5년 (전자상거래법)</li>
        <li>서비스 이용 기록: 3개월 (통신비밀보호법)</li>
      </ul>

      <h2>4. 개인정보의 파기 절차 및 방법</h2>
      <p>
        보유 기간 경과 또는 처리 목적 달성 후 지체 없이 파기합니다.
        전자적 파일은 복구 불가능한 방법으로 삭제하며, 종이 문서는 분쇄 또는
        소각합니다.
      </p>

      <h2>5. 제3자 제공</h2>
      <p>
        회사는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의
        경우 예외로 합니다.
      </p>
      <ul>
        <li>이용자가 사전에 동의한 경우</li>
        <li>법률에 특별한 규정이 있는 경우</li>
      </ul>
      <p>
        서비스 내 쿠팡 구매 링크를 통한 상품 구매 시 쿠팡 파트너스 정책에 따라
        처리되며, 회사는 구매 정보를 별도로 수집하지 않습니다.
      </p>

      <h2>6. 정보주체의 권리</h2>
      <ul>
        <li>개인정보 열람, 정정, 삭제, 처리정지 요청</li>
        <li>회원 탈퇴를 통한 개인정보 삭제</li>
        <li>위 권리 행사는 이메일(jaemyung123@naver.com)로 요청할 수 있습니다.</li>
      </ul>

      <h2>7. 개인정보 보호책임자</h2>
      <p>
        성명: 이재명
        <br />
        이메일: jaemyung123@naver.com
        <br />
        전화: 010-8828-6712
      </p>

      <h2>8. 개인정보처리방침 변경</h2>
      <p>
        본 방침은 시행일로부터 적용되며, 변경 사항이 있을 경우 서비스 내 공지를
        통해 안내합니다.
      </p>
    </div>
  )
}

export default PrivacyPage
