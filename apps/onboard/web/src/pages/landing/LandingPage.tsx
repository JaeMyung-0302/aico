import { Link } from 'react-router-dom'
import classNames from 'classnames/bind'
import styles from './LandingPage.module.scss'

const cx = classNames.bind(styles)

const PAIN_POINTS = [
  {
    title: '반복되는 질문 응대',
    description: '신규 입사자가 물어볼 때마다 시니어가 같은 답변을 반복합니다.',
  },
  {
    title: '흩어진 온보딩 문서',
    description: 'Notion, Google Drive, Slack에 문서가 분산되어 찾기 어렵습니다.',
  },
  {
    title: '진행 상황 파악 불가',
    description: '누가 어디까지 온보딩을 완료했는지 관리자가 알 수 없습니다.',
  },
]

const FEATURES = [
  {
    icon: 'sync',
    title: 'Notion/GitHub 연동',
    description: '기존 문서를 연결하면 자동으로 동기화됩니다. 별도 문서 작성이 필요 없습니다.',
  },
  {
    icon: 'chat',
    title: 'AI 챗봇 답변',
    description: '신규 팀원이 궁금한 것을 즉시 질문하면 AI가 문서 기반으로 정확히 답변합니다.',
  },
  {
    icon: 'checklist',
    title: '온보딩 체크리스트',
    description: '단계별 체크리스트로 온보딩 진행률을 실시간으로 추적할 수 있습니다.',
  },
  {
    icon: 'dashboard',
    title: '관리자 대시보드',
    description: '팀 전체 온보딩 현황을 한눈에 파악하고 병목을 빠르게 해결합니다.',
  },
]

const STEPS = [
  {
    step: '01',
    title: '문서 연동',
    description: 'Notion, GitHub 등 기존 도구를 연결합니다.',
  },
  {
    step: '02',
    title: 'AI 학습',
    description: '연동된 문서를 AI가 분석하고 학습합니다.',
  },
  {
    step: '03',
    title: '온보딩 자동화',
    description: '신규 팀원이 입사하면 AI가 자동으로 안내합니다.',
  },
]

const PRICING = [
  {
    name: 'Free',
    price: '0',
    description: '소규모 팀을 위한 무료 플랜',
    features: ['팀원 5명까지', 'AI 챗봇 월 100회', '기본 체크리스트', 'Notion 연동'],
    isPopular: false,
    cta: '무료로 시작하기',
  },
  {
    name: 'Pro',
    price: '49,000',
    description: '성장하는 스타트업을 위한 플랜',
    features: [
      '팀원 30명까지',
      'AI 챗봇 무제한',
      '맞춤 체크리스트',
      'Notion + GitHub 연동',
      '관리자 대시보드',
      '이메일 지원',
    ],
    isPopular: true,
    cta: '14일 무료 체험',
  },
  {
    name: 'Enterprise',
    price: '별도 문의',
    description: '대규모 팀을 위한 맞춤 플랜',
    features: [
      '팀원 무제한',
      'AI 챗봇 무제한',
      'SSO / SAML 인증',
      'API 액세스',
      '전담 매니저',
      'SLA 보장',
    ],
    isPopular: false,
    cta: '문의하기',
  },
]

const FeatureIcon = ({ type }: { type: string }) => {
  const iconMap: Record<string, React.ReactNode> = {
    sync: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
      </svg>
    ),
    chat: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    checklist: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    dashboard: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  }

  return <span className={cx('featureIcon')}>{iconMap[type]}</span>
}

export const LandingPage = () => {
  return (
    <div className={cx('page')}>
      {/* Header */}
      <header className={cx('header')}>
        <div className={cx('headerInner')}>
          <span className={cx('logo')}>Onboard</span>
          <Link to="/auth" className={cx('headerCta')}>
            로그인
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className={cx('hero')}>
        <div className={cx('container')}>
          <span className={cx('badge')}>스타트업을 위한 온보딩 자동화</span>
          <h1 className={cx('heroTitle')}>
            AI가 온보딩을
            <br />
            자동화합니다
          </h1>
          <p className={cx('heroSub')}>
            문서를 연동하면 AI가 신규 팀원의 질문에 대신 답변합니다.
            <br />
            시니어의 반복 업무를 줄이고, 온보딩 품질을 높이세요.
          </p>
          <Link to="/auth" className={cx('ctaButton')}>
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Pain Points */}
      <section className={cx('section', 'sectionAlt')}>
        <div className={cx('container')}>
          <h2 className={cx('sectionTitle')}>이런 문제를 겪고 계신가요?</h2>
          <p className={cx('sectionSub')}>
            스타트업에서 온보딩은 늘 후순위입니다. 하지만 그 비용은 생각보다 큽니다.
          </p>
          <div className={cx('painGrid')}>
            {PAIN_POINTS.map((point) => (
              <div key={point.title} className={cx('painCard')}>
                <h3 className={cx('painTitle')}>{point.title}</h3>
                <p className={cx('painDesc')}>{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={cx('section')}>
        <div className={cx('container')}>
          <h2 className={cx('sectionTitle')}>Onboard가 해결합니다</h2>
          <p className={cx('sectionSub')}>
            기존 문서와 도구를 그대로 활용하면서, AI가 온보딩 전 과정을 자동화합니다.
          </p>
          <div className={cx('featureGrid')}>
            {FEATURES.map((feature) => (
              <div key={feature.title} className={cx('featureCard')}>
                <FeatureIcon type={feature.icon} />
                <h3 className={cx('featureTitle')}>{feature.title}</h3>
                <p className={cx('featureDesc')}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={cx('section', 'sectionAlt')}>
        <div className={cx('container')}>
          <h2 className={cx('sectionTitle')}>3단계로 시작하세요</h2>
          <p className={cx('sectionSub')}>
            복잡한 설정 없이 빠르게 시작할 수 있습니다.
          </p>
          <div className={cx('stepsGrid')}>
            {STEPS.map((step) => (
              <div key={step.step} className={cx('stepCard')}>
                <span className={cx('stepNumber')}>{step.step}</span>
                <h3 className={cx('stepTitle')}>{step.title}</h3>
                <p className={cx('stepDesc')}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={cx('section')}>
        <div className={cx('container')}>
          <h2 className={cx('sectionTitle')}>심플한 요금제</h2>
          <p className={cx('sectionSub')}>
            팀 규모에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.
          </p>
          <div className={cx('pricingGrid')}>
            {PRICING.map((tier) => (
              <div
                key={tier.name}
                className={cx('pricingCard', { pricingPopular: tier.isPopular })}
              >
                {tier.isPopular && (
                  <span className={cx('popularBadge')}>추천</span>
                )}
                <h3 className={cx('pricingName')}>{tier.name}</h3>
                <p className={cx('pricingDesc')}>{tier.description}</p>
                <div className={cx('pricingPrice')}>
                  {tier.price === '별도 문의' ? (
                    <span className={cx('priceCustom')}>{tier.price}</span>
                  ) : (
                    <>
                      <span className={cx('priceAmount')}>{tier.price}</span>
                      <span className={cx('priceUnit')}>원/월</span>
                    </>
                  )}
                </div>
                <ul className={cx('pricingFeatures')}>
                  {tier.features.map((feature) => (
                    <li key={feature} className={cx('pricingFeatureItem')}>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className={cx('pricingCta', { pricingCtaPrimary: tier.isPopular })}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={cx('ctaSection')}>
        <div className={cx('container')}>
          <h2 className={cx('ctaSectionTitle')}>
            온보딩 자동화,
            <br />
            지금 시작하세요
          </h2>
          <p className={cx('ctaSectionSub')}>
            5분 안에 설정을 완료하고 팀의 온보딩을 혁신하세요.
          </p>
          <Link to="/auth" className={cx('ctaButton')}>
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={cx('footer')}>
        <div className={cx('footerInner')}>
          <span className={cx('footerLogo')}>Onboard</span>
          <nav className={cx('footerNav')}>
            <a href="#features" className={cx('footerLink')}>기능</a>
            <a href="#pricing" className={cx('footerLink')}>요금제</a>
            <Link to="/auth" className={cx('footerLink')}>로그인</Link>
          </nav>
          <p className={cx('footerCopy')}>
            &copy; 2026 Onboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
