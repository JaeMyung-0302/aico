import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/lib/api'
import styles from './TeamSetupPage.module.scss'

type RoleKey = 'common' | 'developer' | 'designer' | 'pm'

interface Template {
  key: RoleKey
  label: string
  title: string
  items: ReadonlyArray<{ title: string }>
}

const TEMPLATES: ReadonlyArray<Template> = [
  {
    key: 'common',
    label: '공통',
    title: '공통 온보딩',
    items: [
      { title: '회사 Slack 채널 가입' },
      { title: '이메일/캘린더 설정' },
      { title: '사내 규정 및 복리후생 안내 확인' },
      { title: '팀원 자기소개' },
      { title: '1:1 온보딩 미팅 예약' },
    ],
  },
  {
    key: 'developer',
    label: '개발자',
    title: '개발자 온보딩',
    items: [
      { title: '개발 환경 세팅 (IDE, 터미널, 패키지 매니저)' },
      { title: 'GitHub 조직 초대 수락 및 권한 확인' },
      { title: '로컬 개발 환경 빌드 및 실행 확인' },
      { title: '코드 컨벤션 및 PR 가이드 숙지' },
      { title: 'CI/CD 파이프라인 이해' },
      { title: '첫 번째 이슈 할당 및 PR 제출' },
    ],
  },
  {
    key: 'designer',
    label: '디자이너',
    title: '디자이너 온보딩',
    items: [
      { title: 'Figma 팀 초대 수락' },
      { title: '디자인 시스템 및 컴포넌트 라이브러리 확인' },
      { title: '브랜드 가이드라인 숙지' },
      { title: '진행 중인 프로젝트 디자인 파일 확인' },
      { title: '디자인 리뷰 프로세스 이해' },
    ],
  },
  {
    key: 'pm',
    label: 'PM',
    title: 'PM 온보딩',
    items: [
      { title: '프로젝트 관리 도구 접근 권한 확인 (Jira/Linear)' },
      { title: '제품 로드맵 및 백로그 확인' },
      { title: '주요 이해관계자 미팅 일정 잡기' },
      { title: '경쟁사 분석 자료 확인' },
      { title: '주간 스프린트/스탠드업 참여' },
    ],
  },
] as const

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

type Step = 'create' | 'templates'

export const TeamSetupPage = () => {
  const [step, setStep] = useState<Step>('create')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [selectedTemplates, setSelectedTemplates] = useState<ReadonlySet<RoleKey>>(new Set())
  const [isCreatingTemplates, setIsCreatingTemplates] = useState(false)
  const [templateError, setTemplateError] = useState('')

  const { createTenant, tenant, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleNameChange = (value: string) => {
    setName(value)
    if (!isSlugEdited) {
      setSlug(toSlug(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setIsSlugEdited(true)
    setSlug(toSlug(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()

    if (!trimmedName) {
      setError('팀 이름을 입력해주세요.')
      return
    }
    if (!trimmedSlug) {
      setError('팀 URL을 입력해주세요.')
      return
    }
    if (trimmedSlug.length < 3) {
      setError('팀 URL은 3자 이상이어야 합니다.')
      return
    }

    setIsLoading(true)
    try {
      await createTenant(trimmedName, trimmedSlug)
      setStep('templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : '팀 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTemplate = (key: RoleKey) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleCreateTemplates = async () => {
    if (selectedTemplates.size === 0 || !tenant) return

    setIsCreatingTemplates(true)
    setTemplateError('')

    try {
      const selected = TEMPLATES.filter((t) => selectedTemplates.has(t.key))
      await Promise.all(
        selected.map((template) =>
          api.post('/checklists', { title: template.title, items: [...template.items] }),
        ),
      )
      navigate('/dashboard')
    } catch (err) {
      setTemplateError(
        err instanceof Error ? err.message : '템플릿 생성에 실패했습니다.',
      )
    } finally {
      setIsCreatingTemplates(false)
    }
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  if (step === 'templates') {
    return (
      <div className={styles.container}>
        <div className={`${styles.card} ${styles.cardWide}`}>
          <h1 className={styles.title}>온보딩 템플릿</h1>
          <p className={styles.subtitle}>
            어떤 직군의 온보딩 템플릿을 추가할까요?
          </p>

          <div className={styles.templateGrid}>
            {TEMPLATES.map((template) => {
              const isSelected = selectedTemplates.has(template.key)
              return (
                <button
                  key={template.key}
                  type="button"
                  className={`${styles.templateCard} ${isSelected ? styles.templateSelected : ''}`}
                  onClick={() => handleToggleTemplate(template.key)}
                >
                  <span className={styles.templateLabel}>{template.label}</span>
                  <span className={styles.templateCount}>
                    {template.items.length}개 항목
                  </span>
                  <ul className={styles.templateItems}>
                    {template.items.map((item) => (
                      <li key={item.title}>{item.title}</li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>

          {templateError && <p className={styles.error}>{templateError}</p>}

          <div className={styles.templateActions}>
            <button
              type="button"
              className={styles.button}
              disabled={selectedTemplates.size === 0 || isCreatingTemplates}
              onClick={handleCreateTemplates}
            >
              {isCreatingTemplates
                ? '생성 중...'
                : `선택한 템플릿 추가 (${selectedTemplates.size})`}
            </button>
            <button
              type="button"
              className={styles.skipButton}
              onClick={handleSkip}
              disabled={isCreatingTemplates}
            >
              건너뛰기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>팀 생성</h1>
        <p className={styles.subtitle}>시작하려면 팀을 만들어주세요.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            팀 이름
            <input
              type="text"
              placeholder="예: 우리 회사"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={styles.input}
              autoFocus
            />
          </label>

          <label className={styles.label}>
            팀 URL (slug)
            <input
              type="text"
              placeholder="예: our-company"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={styles.input}
            />
            <span className={styles.hint}>영문, 숫자, 하이픈만 사용 가능</span>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? '생성 중...' : '팀 생성'}
          </button>
        </form>

        <button className={styles.logout} onClick={signOut}>
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  )
}
