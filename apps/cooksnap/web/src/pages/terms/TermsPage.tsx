import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import styles from './TermsPage.module.scss'

const cx = classnames.bind(styles)

const TermsPage = () => {
  return (
    <div className={cx('terms')}>
      <Helmet>
        <title>이용약관 - CookSnap</title>
        <meta name="description" content="CookSnap 서비스 이용약관" />
        <link rel="canonical" href="https://cooksnap.aico-app.com/terms" />
      </Helmet>

      <h1>이용약관</h1>
      <p className={cx('updated')}>최종 수정일: 2026년 3월 31일</p>

      <h2>제1조 (목적)</h2>
      <p>
        이 약관은 에이코(AICO, 이하 &quot;회사&quot;)가 제공하는 CookSnap
        서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차에 관한 사항을
        규정합니다.
      </p>

      <h2>제2조 (서비스의 내용)</h2>
      <p>
        서비스는 숏폼 레시피 영상(Instagram Reels, TikTok, YouTube Shorts)의
        URL을 분석하여 레시피 정보, 재료 목록, 예상 재료비, 구매 링크를 제공하는
        AI 기반 서비스입니다.
      </p>

      <h2>제3조 (이용 조건)</h2>
      <ul>
        <li>서비스 이용을 위해 Google 계정을 통한 로그인이 필요합니다.</li>
        <li>무료 플랜은 일일 분석 횟수에 제한이 있습니다.</li>
        <li>프리미엄 플랜 가입 시 추가 분석 횟수가 제공됩니다.</li>
      </ul>

      <h2>제4조 (면책 조항)</h2>
      <ul>
        <li>
          AI 분석 결과의 정확성을 보장하지 않으며, 재료비는
          한국농수산식품유통공사(KAMIS) 소매가 기준 참고 정보입니다.
        </li>
        <li>실제 구매가와 차이가 있을 수 있습니다.</li>
        <li>서비스 이용 중 발생하는 외부 사이트 거래에 대해 책임지지 않습니다.</li>
      </ul>

      <h2>제5조 (쿠팡 파트너스)</h2>
      <p>
        서비스 내 재료 구매 링크는 쿠팡 파트너스 활동의 일환으로 제공되며, 이에
        따른 일정액의 수수료를 제공받습니다.
      </p>

      <h2>제6조 (프리미엄 구독)</h2>
      <ul>
        <li>프리미엄 구독은 월 단위로 결제됩니다.</li>
        <li>결제일로부터 7일 이내 환불 요청이 가능합니다.</li>
        <li>구독 해지 시 결제 주기 종료일까지 서비스를 이용할 수 있습니다.</li>
      </ul>

      <h2>제7조 (연락처)</h2>
      <p>
        서비스 관련 문의: jaemyung123@naver.com
        <br />
        사업자등록번호: 220-17-02629
        <br />
        주소: 서울특별시 광진구 아차산로 391, 에뗴르넬비욘드
      </p>
    </div>
  )
}

export default TermsPage
