import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { useFoodItemStore } from '@/stores/useFoodItemStore'
import { IngredientSelector } from '@/components/IngredientSelector'
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
  const { activeFridgeId, fridges, loading: fridgeLoading, setActiveFridge, fetchFridges } = useFridgeStore()
  const { recipes, cached, remainingCount, loading, error, suggestRecipes, fetchRemainingCount, clearRecipes } = useRecipeStore()
  const { items: foodItemDetails, fetchItems } = useFoodItemStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const initializedFridgeRef = useRef<string | null>(null)

  useEffect(() => {
    fetchFridges()
  }, [fetchFridges])

  // compartment별 FoodItemResponse 로드 (category 포함)
  useEffect(() => {
    const fridge = fridges.find((f) => f.id === activeFridgeId)
    if (!fridge) return
    const currentItems = useFoodItemStore.getState().items
    fridge.compartments.forEach((c) => {
      if (!currentItems[c.id]) {
        fetchItems(c.id)
      }
    })
  }, [fridges, activeFridgeId, fetchItems])

  const foodItems = useMemo(() => {
    const fridge = fridges.find((f) => f.id === activeFridgeId)
    if (!fridge) return []
    return fridge.compartments.flatMap((c) => {
      const details = foodItemDetails[c.id] ?? []
      const detailMap = new Map(details.map((d) => [d.id, d]))
      return c.foodItems.map((item) => {
        const detail = detailMap.get(item.id)
        return { ...item, category: detail?.category }
      })
    })
  }, [fridges, activeFridgeId, foodItemDetails])

  useEffect(() => {
    if (initializedFridgeRef.current === activeFridgeId) return
    if (foodItems.length === 0) return
    initializedFridgeRef.current = activeFridgeId
    setSelectedIds(new Set(foodItems.map((item) => item.id)))
  }, [foodItems, activeFridgeId])

  useEffect(() => {
    fetchRemainingCount()
  }, [fetchRemainingCount])

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === foodItems.length) {
        return new Set()
      }
      return new Set(foodItems.map((item) => item.id))
    })
  }, [foodItems])

  const handleSuggest = useCallback(async () => {
    if (!activeFridgeId || selectedIds.size === 0) return
    const ids = selectedIds.size === foodItems.length ? undefined : [...selectedIds]
    await suggestRecipes(activeFridgeId, ids)
  }, [activeFridgeId, selectedIds, foodItems.length, suggestRecipes])

  const handleFridgeSelect = useCallback((id: string) => {
    if (id === activeFridgeId) return
    setActiveFridge(id)
    initializedFridgeRef.current = null
    clearRecipes()
  }, [activeFridgeId, setActiveFridge, clearRecipes])

  const handleRecipeClick = useCallback((index: number) => {
    navigate(`/recipes/${index}`)
  }, [navigate])

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>AI 레시피 추천</h1>

      {fridgeLoading && (
        <div className={cx('loading')}>불러오는 중...</div>
      )}

      {!fridgeLoading && fridges.length >= 2 && (
        <div className={cx('fridgeSelector')}>
          {fridges.map((fridge) => (
            <button
              key={fridge.id}
              className={cx('fridgeChip', { fridgeChipActive: fridge.id === activeFridgeId })}
              onClick={() => handleFridgeSelect(fridge.id)}
              type="button"
              aria-current={fridge.id === activeFridgeId ? 'true' : undefined}
            >
              {fridge.name}
            </button>
          ))}
        </div>
      )}

      {!fridgeLoading && activeFridgeId && foodItems.length > 0 && (
        <IngredientSelector
          items={foodItems}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
        />
      )}

      <div className={cx('actionArea')}>
        <button
          className={cx('suggestBtn')}
          onClick={handleSuggest}
          disabled={loading || !activeFridgeId || selectedIds.size === 0 || remainingCount === 0}
          type="button"
        >
          {loading ? '추천 중...' : '냉장고 재료로 추천받기'}
        </button>
        <p className={cx('remaining')}>
          이번 주 남은 횟수: {remainingCount}회
          {cached && <span className={cx('cachedBadge')}>캐시</span>}
        </p>
      </div>

      {!fridgeLoading && !activeFridgeId && (
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
