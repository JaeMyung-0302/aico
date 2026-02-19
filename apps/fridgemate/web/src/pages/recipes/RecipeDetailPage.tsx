import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { buildCoupangLink } from '@/lib/coupang'
import type { RecipeSuggestion } from '@/types'
import styles from './RecipeDetailPage.module.scss'

const cx = classNames.bind(styles)

const DIFFICULTY_LABELS: Record<RecipeSuggestion['difficulty'], string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

export const RecipeDetailPage = () => {
  const { index } = useParams<{ index: string }>()
  const navigate = useNavigate()
  const { activeFridgeId } = useFridgeStore()
  const { recipes, cookComplete } = useRecipeStore()

  const recipeIndex = Number(index)
  const recipe = recipes[recipeIndex]

  // 요리 완료 체크리스트 (보유 재료만)
  const inFridgeIngredients = useMemo(
    () => recipe?.ingredients.filter((i) => i.inFridge).map((i) => i.name) ?? [],
    [recipe],
  )

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set(inFridgeIngredients))
  const [completing, setCompleting] = useState(false)

  const handleToggle = useCallback((name: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  const handleCookComplete = useCallback(async () => {
    if (!activeFridgeId || checkedItems.size === 0) return
    setCompleting(true)
    try {
      await cookComplete(activeFridgeId, [...checkedItems])
      navigate('/recipes')
    } catch {
      // store에서 에러 처리
    } finally {
      setCompleting(false)
    }
  }, [activeFridgeId, checkedItems, cookComplete, navigate])

  if (!recipe) {
    return (
      <div className={cx('page')}>
        <div className={cx('empty')}>
          <p className={cx('emptyText')}>레시피를 찾을 수 없습니다.</p>
          <button
            className={cx('backBtn')}
            onClick={() => navigate('/recipes')}
            type="button"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const inFridgeCount = recipe.ingredients.filter((i) => i.inFridge).length
  const totalCount = recipe.ingredients.length

  return (
    <div className={cx('page')}>
      <button
        className={cx('backBtn')}
        onClick={() => navigate('/recipes')}
        type="button"
      >
        ← 목록으로
      </button>

      <div className={cx('header')}>
        <h1 className={cx('recipeName')}>{recipe.name}</h1>
        <div className={cx('meta')}>
          <span className={cx('difficulty', recipe.difficulty)}>
            {DIFFICULTY_LABELS[recipe.difficulty]}
          </span>
          <span className={cx('cookTime')}>⏱ {recipe.cookTime}분</span>
        </div>
        <p className={cx('description')}>{recipe.description}</p>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>
          재료
          <span className={cx('ingredientCount')}>
            {inFridgeCount}/{totalCount} 보유
          </span>
        </h2>
        <ul className={cx('ingredientList')}>
          {recipe.ingredients.map((ing, i) => (
            <li key={`${ing.name}-${i}`} className={cx('ingredientItem', { inFridge: ing.inFridge })}>
              {ing.inFridge ? (
                <label className={cx('checkLabel')}>
                  <input
                    type="checkbox"
                    checked={checkedItems.has(ing.name)}
                    onChange={() => handleToggle(ing.name)}
                    className={cx('checkbox')}
                  />
                  <span className={cx('ingredientName')}>{ing.name}</span>
                </label>
              ) : (
                <>
                  <span className={cx('ingredientStatus')}>🛒</span>
                  <span className={cx('ingredientName')}>{ing.name}</span>
                  <a
                    href={buildCoupangLink(ing.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cx('coupangLink')}
                  >
                    구매
                  </a>
                </>
              )}
              <span className={cx('ingredientAmount')}>
                {ing.amount}{ing.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>조리 순서</h2>
        <ol className={cx('stepList')}>
          {recipe.steps.map((step, i) => (
            <li key={i} className={cx('stepItem')}>
              <span className={cx('stepNumber')}>{i + 1}</span>
              <span className={cx('stepText')}>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {inFridgeIngredients.length > 0 && (
        <div className={cx('cookCompleteArea')}>
          <p className={cx('cookCompleteHint')}>
            체크한 재료 {checkedItems.size}개가 냉장고에서 삭제됩니다
          </p>
          <button
            className={cx('cookCompleteBtn')}
            onClick={handleCookComplete}
            disabled={completing || checkedItems.size === 0}
            type="button"
          >
            {completing ? '처리 중...' : '요리 완료'}
          </button>
        </div>
      )}
    </div>
  )
}
