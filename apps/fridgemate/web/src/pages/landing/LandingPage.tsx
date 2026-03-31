import { Link } from 'react-router-dom'
import classnames from 'classnames/bind'
import styles from './LandingPage.module.scss'

const cx = classnames.bind(styles)

export const LandingPage = () => {
  return (
    <div className={cx('landing')}>
      <header className={cx('hero')}>
        <h1 className={cx('title')}>
          냉장고 관리,
          <br />
          이제 스마트하게
        </h1>
        <p className={cx('subtitle')}>
          냉장고 재료 등록부터 유통기한 알림, AI 레시피 추천, 가족 공유까지.
          FridgeMate로 식재료 낭비를 줄이세요.
        </p>
        <Link to="/register" className={cx('cta')}>
          무료로 시작하기
        </Link>
        <p className={cx('login')}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </header>

      <section className={cx('features')}>
        <h2>FridgeMate 주요 기능</h2>

        <div className={cx('featureGrid')}>
          <div className={cx('featureCard')}>
            <span className={cx('featureIcon')}>🧊</span>
            <h3>냉장고 재료 관리</h3>
            <p>
              냉장고에 있는 재료를 간편하게 등록하고 관리하세요. 카테고리별로
              정리되어 한눈에 어떤 재료가 있는지 확인할 수 있습니다. 수량과
              유통기한을 함께 기록하면 더욱 체계적으로 관리할 수 있습니다.
            </p>
          </div>

          <div className={cx('featureCard')}>
            <span className={cx('featureIcon')}>⏰</span>
            <h3>유통기한 알림</h3>
            <p>
              유통기한이 다가오는 재료를 자동으로 알려드립니다. D-3, D-1, D-day
              단계별 알림으로 식재료를 버리기 전에 활용할 수 있도록 도와줍니다.
              푸시 알림을 지원하여 앱을 열지 않아도 알림을 받을 수 있습니다.
            </p>
          </div>

          <div className={cx('featureCard')}>
            <span className={cx('featureIcon')}>🍳</span>
            <h3>AI 레시피 추천</h3>
            <p>
              냉장고에 있는 재료를 기반으로 AI가 만들 수 있는 레시피를
              추천합니다. &quot;오늘 뭐 해먹지?&quot;라는 고민을 해결해 드립니다.
              재료를 최대한 활용하는 레시피를 우선 추천하여 식재료 낭비를
              줄여줍니다.
            </p>
          </div>

          <div className={cx('featureCard')}>
            <span className={cx('featureIcon')}>👨‍👩‍👧‍👦</span>
            <h3>가족 그룹 공유</h3>
            <p>
              가족이나 룸메이트와 냉장고를 함께 관리하세요. 그룹을 만들어
              초대하면 같은 냉장고의 재료를 함께 확인하고 관리할 수 있습니다.
              누가 어떤 재료를 추가했는지, 무엇을 사용했는지 실시간으로 공유됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className={cx('howItWorks')}>
        <h2>어떻게 사용하나요?</h2>
        <ol className={cx('steps')}>
          <li>
            <strong>1. 회원가입</strong> — 이메일로 간편하게 가입하세요. 30초면
            완료됩니다.
          </li>
          <li>
            <strong>2. 냉장고 설정</strong> — 냉장고 이름을 정하고, 가족이나
            룸메이트를 초대하세요.
          </li>
          <li>
            <strong>3. 재료 등록</strong> — 냉장고에 있는 재료를 등록하세요.
            유통기한을 입력하면 자동으로 알림을 받을 수 있습니다.
          </li>
          <li>
            <strong>4. 레시피 추천</strong> — 보유 재료를 기반으로 AI가 레시피를
            추천합니다. 오늘 저녁 메뉴를 골라보세요.
          </li>
        </ol>
      </section>

      <section className={cx('faq')}>
        <h2>자주 묻는 질문</h2>
        <dl>
          <dt>FridgeMate는 무료인가요?</dt>
          <dd>
            네, FridgeMate는 무료로 사용할 수 있습니다. 기본적인 냉장고 관리,
            유통기한 알림, 레시피 추천 기능을 무료로 제공합니다.
          </dd>
          <dt>어떤 기기에서 사용할 수 있나요?</dt>
          <dd>
            FridgeMate는 PWA(Progressive Web App)로 제작되어 스마트폰, 태블릿,
            PC 등 모든 기기의 웹 브라우저에서 사용할 수 있습니다. 홈 화면에
            추가하면 앱처럼 사용할 수 있습니다.
          </dd>
          <dt>가족과 어떻게 공유하나요?</dt>
          <dd>
            회원가입 후 그룹을 만들고, 가족이나 룸메이트의 이메일로 초대하면
            됩니다. 초대받은 사람이 가입하면 같은 냉장고를 함께 관리할 수
            있습니다.
          </dd>
        </dl>
      </section>

      <footer className={cx('footer')}>
        <div className={cx('footerLinks')}>
          <Link to="/terms">이용약관</Link>
          <span className={cx('divider')}>|</span>
          <Link to="/privacy">개인정보처리방침</Link>
        </div>
        <div className={cx('business')}>
          <p>에이코(AICO) | 대표: 이재명 | 사업자등록번호: 220-17-02629</p>
          <p>서울특별시 광진구 아차산로 391, 에뗴르넬비욘드</p>
          <p>이메일: jaemyung123@naver.com</p>
        </div>
        <p className={cx('copyright')}>
          &copy; {new Date().getFullYear()} AICO. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
