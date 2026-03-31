import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import styles from './TermsPage.module.scss'

const cx = classnames.bind(styles)

export const TermsPage = () => {
  return (
    <div className={cx('legal')}>
      <Helmet>
        <title>이용약관 - FridgeMate</title>
        <meta name="description" content="FridgeMate 서비스 이용약관" />
        <link rel="canonical" href="https://fridgemate.aico-app.com/terms" />
      </Helmet>
      <Link to="/" className={cx('back')}>&larr; 홈으로</Link>
      <h1>이용약관</h1>
      <p className={cx('updated')}>최종 수정일: 2026년 3월 31일</p>

      <h2>제1조 (목적)</h2>
      <p>이 약관은 에이코(AICO, 이하 &quot;회사&quot;)가 제공하는 FridgeMate 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차에 관한 사항을 규정합니다.</p>

      <h2>제2조 (서비스의 내용)</h2>
      <p>서비스는 냉장고 재료 관리, 유통기한 알림, AI 레시피 추천, 그룹 공유 등을 제공하는 웹 애플리케이션입니다.</p>

      <h2>제3조 (이용 조건)</h2>
      <ul>
        <li>서비스 이용을 위해 이메일 계정을 통한 회원가입이 필요합니다.</li>
        <li>서비스는 무료로 제공됩니다.</li>
      </ul>

      <h2>제4조 (면책 조항)</h2>
      <ul>
        <li>AI 레시피 추천의 정확성을 보장하지 않으며, 참고 정보로 활용하시기 바랍니다.</li>
        <li>유통기한 알림은 사용자가 입력한 정보를 기반으로 하며, 실제 식품 상태와 차이가 있을 수 있습니다.</li>
      </ul>

      <h2>제5조 (연락처)</h2>
      <p>서비스 관련 문의: jaemyung123@naver.com<br />사업자등록번호: 220-17-02629<br />주소: 서울특별시 광진구 아차산로 391, 에뗴르넬비욘드</p>
    </div>
  )
}
