import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { Loading } from '@repo/ui'
import useRedirectUrl from '@/hooks/useRedirectUrl'
import type { Recipe, PriceInfo, PurchaseLink } from '@/types/recipe'
import styles from './ResultPage.module.scss'

const cx = classnames.bind(styles)

const formatPrice = (price: number | null): string => {
  if (price === null) return '-'
  return `${price.toLocaleString()}원`
}

const Result = () => {
  const { isAuthenticated, isLoading: authLoading } = useRedirectUrl()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const {
    data: recipe,
    isLoading,
    error,
  } = useQuery<Recipe>({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const { data } = await api.get(`/recipes/${id}`)
      return data
    },
    enabled: !!id && isAuthenticated,
  })

  // 403 (소유권 없음) 시 메인으로 이동
  useEffect(() => {
    if (error instanceof AxiosError && error.response?.status === 403) {
      navigate('/', { replace: true })
    }
  }, [error, navigate])

  // 저장 여부 확인 (로그인 사용자)
  // TODO: PMF 검증 완료 후 enabled 조건에 !!user?.isPremium 복구
  const { data: saveStatus } = useQuery<{ saved: boolean }>({
    queryKey: ['recipe-saved', id],
    queryFn: async () => {
      const { data } = await api.get(`/users/me/recipes/${id}/saved`)
      return data
    },
    enabled: !!user && !!id,
  })

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/users/me/recipes/${id}/save`),
    onSuccess: () => {
      queryClient.setQueryData(['recipe-saved', id], { saved: true })
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] })
    },
  })

  const unsaveMutation = useMutation({
    mutationFn: () => api.delete(`/users/me/recipes/${id}/save`),
    onSuccess: () => {
      queryClient.setQueryData(['recipe-saved', id], { saved: false })
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] })
    },
  })

  // TODO: PMF 검증 완료 후 isPremium 체크 복구
  const handleToggleSave = () => {
    if (saveStatus?.saved) {
      unsaveMutation.mutate()
    } else {
      saveMutation.mutate()
    }
  }

  // KAMIS 시세 조회 (레시피 로딩 완료 후)
  const { data: prices } = useQuery<PriceInfo[]>({
    queryKey: ['prices', id],
    queryFn: async () => {
      const { data } = await api.get(`/recipes/${id}/prices`)
      return data
    },
    enabled: !!recipe,
    staleTime: 6 * 60 * 60 * 1000, // 6시간 (서버 캐시와 동일)
  })

  // 구매 링크 조회 (레시피 로딩 완료 후)
  const { data: purchaseLinks } = useQuery<PurchaseLink[]>({
    queryKey: ['purchaseLinks', id],
    queryFn: async () => {
      const { data } = await api.get(`/recipes/${id}/purchase-links`)
      return data
    },
    enabled: !!recipe,
  })

  // 재료별 KAMIS 시세 매핑
  const getPriceForIngredient = (ingredientId: string): number | null => {
    if (!prices) return null
    const found = prices.find((p) => p.ingredientId === ingredientId)
    return found?.price ?? null
  }

  // 재료별 구매 링크 매핑
  const getLinkForIngredient = (ingredientId: string): string | null => {
    if (!purchaseLinks) return null
    const link = purchaseLinks.find((l) => l.ingredientId === ingredientId)
    return link?.purchaseUrl || null
  }

  if (authLoading || !isAuthenticated || isLoading) {
    return <Loading message="레시피를 불러오는 중..." />
  }

  if (error || !recipe) {
    return (
      <div className={cx('result')}>
        <div className={cx('error')}>
          <p className={cx('errorText')}>레시피를 불러올 수 없습니다.</p>
          <button className={cx('retryButton')} onClick={() => navigate('/')}>
            다시 분석하기
          </button>
        </div>
      </div>
    )
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    ...(recipe.thumbnailUrl && { image: recipe.thumbnailUrl }),
    ...(recipe.cookTime && { cookTime: `PT${recipe.cookTime}M` }),
    ...(recipe.servings && { recipeYield: `${recipe.servings}인분` }),
    description: `${recipe.title} 레시피 - 재료 ${recipe.ingredients.length}가지`,
    datePublished: recipe.createdAt,
    author: {
      '@type': 'Organization',
      name: 'CookSnap',
      url: 'https://cooksnap.aico-app.com/',
    },
    recipeIngredient: recipe.ingredients.map(
      (i) => `${i.name}${i.amount ? ` ${i.amount}` : ''}${i.unit || ''}`,
    ),
    recipeInstructions: recipe.steps.map((s) => ({
      '@type': 'HowToStep',
      text: s.description,
    })),
  }

  return (
    <div className={cx('result')}>
      <Helmet>
        <title>{recipe.title} - CookSnap</title>
        <meta
          name="description"
          content={`${recipe.title} 레시피 - 재료비 ${recipe.totalPrice ? `${recipe.totalPrice.toLocaleString()}원` : '확인'}, 재료 ${recipe.ingredients.length}가지`}
        />
        <link
          rel="canonical"
          href={`https://cooksnap.aico-app.com/result/${id}`}
        />
        <meta property="og:title" content={`${recipe.title} - CookSnap`} />
        <meta
          property="og:description"
          content={`재료 ${recipe.ingredients.length}가지${recipe.totalPrice ? `, 총 ${recipe.totalPrice.toLocaleString()}원` : ''}`}
        />
        {recipe.thumbnailUrl && (
          <meta property="og:image" content={recipe.thumbnailUrl} />
        )}
        <meta
          property="og:url"
          content={`https://cooksnap.aico-app.com/result/${id}`}
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      {/* 레시피 헤더 */}
      <div className={cx('header')}>
        <div className={cx('headerTop')}>
          <h1 className={cx('title')}>{recipe.title}</h1>
          {user && (
            <button
              className={cx('saveButton', {
                saved: saveStatus?.saved,
              })}
              onClick={handleToggleSave}
              disabled={saveMutation.isPending || unsaveMutation.isPending}
            >
              {saveStatus?.saved ? '저장됨' : '저장'}
            </button>
          )}
        </div>
        <div className={cx('meta')}>
          {recipe.difficulty && (
            <span className={cx('metaItem')}>난이도: {recipe.difficulty}</span>
          )}
          {recipe.cookTime && (
            <span className={cx('metaItem')}>{recipe.cookTime}분</span>
          )}
          {recipe.servings && (
            <span className={cx('metaItem')}>{recipe.servings}인분</span>
          )}
        </div>
      </div>

      {/* 재료 리스트 */}
      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>재료</h2>
        <p className={cx('priceNotice')}>
          가격은 한국농수산식품유통공사(KAMIS) 제공 소매가 기준이며, 실제
          구매가와 차이가 있을 수 있습니다. 일부 가공식품은 시세가 제공되지
          않습니다.
        </p>
        <div className={cx('ingredientList')}>
          {recipe.ingredients.map((ingredient) => {
            const purchaseUrl = getLinkForIngredient(ingredient.id)
            return (
              <div key={ingredient.id} className={cx('ingredientItem')}>
                <div className={cx('ingredientInfo')}>
                  <span className={cx('ingredientName')}>
                    {ingredient.name}
                  </span>
                  {ingredient.amount && (
                    <span className={cx('ingredientAmount')}>
                      {' '}
                      {ingredient.amount}
                      {ingredient.unit || ''}
                    </span>
                  )}
                </div>
                <div className={cx('ingredientActions')}>
                  <span className={cx('ingredientPrice')}>
                    {formatPrice(
                      getPriceForIngredient(ingredient.id) ??
                        ingredient.estimatedPrice,
                    )}
                  </span>
                  {purchaseUrl && (
                    <a
                      href={purchaseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cx('coupangLink')}
                    >
                      구매
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {/* 재료비 합계 */}
        {(() => {
          const total = prices
            ? prices.reduce((sum, p) => sum + (p.price || 0), 0)
            : recipe.totalPrice
          if (!total) return null
          return (
            <div className={cx('priceSummary')}>
              <span className={cx('priceSummaryLabel')}>총 재료비</span>
              <span className={cx('priceSummaryValue')}>
                {formatPrice(total)}
              </span>
            </div>
          )
        })()}
      </div>

      {/* 조리 단계 */}
      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>조리 순서</h2>
        <div className={cx('stepList')}>
          {recipe.steps.map((step) => (
            <div key={step.id} className={cx('stepItem')}>
              <div className={cx('stepNumber')}>{step.stepOrder}</div>
              <p className={cx('stepDescription')}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 쿠팡 파트너스 배너 (모든 유저) */}
      <div className={cx('coupangBanner')}>
        <a
          href="https://link.coupang.com/a/dV0oMd"
          target="_blank"
          rel="noreferrer"
          className={cx('coupangBannerLink')}
        >
          쿠팡에서 최저가 확인하기
        </a>
        <p className={cx('disclaimer')}>
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
          제공받습니다.
        </p>
      </div>

      {/* 쿠팡에서 재료 구매 (sticky) - TODO: PMF 검증 완료 후 isPremium 체크 복구 */}
      {recipe.ingredients.length > 0 && user && (
        <div className={cx('stickyBottom')}>
          <a
            href="https://link.coupang.com/a/dV0oMd"
            target="_blank"
            rel="noreferrer"
            className={cx('cartButton')}
          >
            쿠팡에서 재료 구매하기
          </a>
        </div>
      )}

    </div>
  )
}

export default Result
