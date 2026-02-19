import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { useRecipeStore } from '@/stores/useRecipeStore'
import type { RecipeSuggestion } from '@/types'
import styles from './RecipeSuggestPage.module.scss'

const cx = classNames.bind(styles)

const DIFFICULTY_LABELS: Record<RecipeSuggestion['difficulty'], string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

export const RecipeSuggestPage = () => {
  const navigate = useNavigate()
  const { activeFridgeId } = useFridgeStore()
  const { recipes, cached, remainingCount, loading, error, suggestRecipes } = useRecipeStore()

  const handleSuggest = useCallback(async () => {
    if (!activeFridgeId) return
    await suggestRecipes(activeFridgeId)
  }, [activeFridgeId, suggestRecipes])

  const handleRecipeClick = useCallback((index: number) => {
    navigate(`/recipes/${index}`)
  }, [navigate])

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>AI 레시피 추천</h1>

      <div className={cx('actionArea')}>
        <button
          className={cx('suggestBtn')}
          onClick={handleSuggest}
          disabled={loading || !activeFridgeId}
          type="button"
        >
          {loading ? '추천 중...' : '냉장고 재료로 추천받기'}
        </button>
        <p className={cx('remaining')}>
          오늘 남은 횟수: {remainingCount}회
          {cached && <span className={cx('cachedBadge')}>캐시</span>}
        </p>
      </div>

      {!activeFridgeId && (
        <div className={cx('empty')}>
          <span className={cx('emptyIcon')}>🧊</span>
          <p className={cx('emptyText')}>
            냉장고를 먼저 선택해주세요.
          </p>
        </div>
      )}

      {error && (
        <div className={cx('error')}>
          <p className={cx('errorText')}>{error}</p>
          <button
            className={cx('retryBtn')}
            onClick={handleSuggest}
            type="button"
          >
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && recipes.length === 0 && activeFridgeId && (
        <div className={cx('empty')}>
          <span className={cx('emptyIcon')}>👨‍🍳</span>
          <p className={cx('emptyText')}>
            위 버튼을 눌러 냉장고 재료 기반
            <br />
            AI 레시피를 추천받아 보세요!
          </p>
        </div>
      )}

      {recipes.length > 0 && (
        <div className={cx('recipeList')}>
          {recipes.map((recipe, index) => {
            const inFridgeCount = recipe.ingredients.filter((i) => i.inFridge).length
            const totalCount = recipe.ingredients.length

            return (
              <button
                key={`${recipe.name}-${index}`}
                className={cx('recipeCard')}
                onClick={() => handleRecipeClick(index)}
                type="button"
              >
                <div className={cx('cardHeader')}>
                  <h2 className={cx('recipeName')}>{recipe.name}</h2>
                  <span className={cx('difficulty', recipe.difficulty)}>
                    {DIFFICULTY_LABELS[recipe.difficulty]}
                  </span>
                </div>
                <p className={cx('recipeDesc')}>{recipe.description}</p>
                <div className={cx('cardFooter')}>
                  <span className={cx('cookTime')}>⏱ {recipe.cookTime}분</span>
                  <span className={cx('ingredientMatch')}>
                    재료 {inFridgeCount}/{totalCount}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
