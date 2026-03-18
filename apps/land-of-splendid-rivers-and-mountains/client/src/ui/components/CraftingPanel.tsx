import { useState, useCallback } from 'react'
import { useGameStore } from '@/stores/useGameStore'
import { eventBus } from '@/lib/event-bus'
import { t } from '@/i18n'
import { getCookingRecipes, getFermentationRecipes } from '@/game/systems/fermentation'
import type { RecipeDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

type Tab = 'cooking' | 'fermentation'

const cookingRecipes = getCookingRecipes()
const fermentRecipes = getFermentationRecipes()

interface Props {
  readonly open: boolean
}

const CraftingPanel = ({ open }: Props) => {
  const [tab, setTab] = useState<Tab>('cooking')
  const { inventory, fermentationSlots } = useGameStore()

  const hasIngredients = useCallback(
    (recipe: RecipeDefinition): boolean => {
      return recipe.ingredients.every((ing) => {
        const total = inventory.reduce((sum, slot) => {
          if (!slot) return sum
          return slot.itemId === ing.itemId ? sum + slot.quantity : sum
        }, 0)
        return total >= ing.quantity
      })
    },
    [inventory],
  )

  const handleCook = (recipe: RecipeDefinition) => {
    if (!hasIngredients(recipe)) return
    eventBus.emit('crafting:cook', { recipeId: recipe.id })
  }

  const handleFerment = (recipe: RecipeDefinition) => {
    if (!hasIngredients(recipe)) return
    eventBus.emit('crafting:ferment', { recipeId: recipe.id })
  }

  const handleCollect = (slotIndex: number) => {
    eventBus.emit('crafting:collect', { slotIndex })
  }

  if (!open) return null

  const recipes = tab === 'cooking' ? cookingRecipes : fermentRecipes

  return (
    <div style={styles.panel}>
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tabBtn, ...(tab === 'cooking' ? styles.tabActive : {}) }}
          onClick={() => setTab('cooking')}
        >
          {t('ui.crafting.cooking')}
        </button>
        <button
          style={{ ...styles.tabBtn, ...(tab === 'fermentation' ? styles.tabActive : {}) }}
          onClick={() => setTab('fermentation')}
        >
          {t('ui.crafting.fermentation')}
        </button>
      </div>

      {tab === 'fermentation' && fermentationSlots.length > 0 && (
        <div style={styles.slotsSection}>
          <div style={styles.sectionLabel}>{t('ui.crafting.slots')}</div>
          {fermentationSlots.map((slot) => (
            <div key={slot.slotIndex} style={styles.slotRow}>
              <span style={styles.slotName}>{t(`recipe.${slot.recipeId.replace('ferment-', '')}`)}</span>
              <span style={styles.slotProgress}>
                {slot.elapsed}/{slot.required}{t('ui.crafting.days')}
              </span>
              {slot.elapsed >= slot.required && (
                <button style={styles.collectBtn} onClick={() => handleCollect(slot.slotIndex)}>
                  {t('ui.crafting.collect')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={styles.recipeList}>
        {recipes.map((recipe) => {
          const canMake = hasIngredients(recipe)
          return (
            <div key={recipe.id} style={{ ...styles.recipeRow, opacity: canMake ? 1 : 0.4 }}>
              <div style={styles.recipeName}>{t(recipe.nameKey)}</div>
              <div style={styles.ingredients}>
                {recipe.ingredients.map((ing) => (
                  <span key={ing.itemId} style={styles.ingredient}>
                    {t(`item.${ing.itemId.replace('-', '.')}`)} x{ing.quantity}
                  </span>
                ))}
              </div>
              {recipe.fermentationDays && (
                <span style={styles.fermentDays}>{recipe.fermentationDays}{t('ui.crafting.days')}</span>
              )}
              <button
                style={{ ...styles.craftBtn, opacity: canMake ? 1 : 0.5 }}
                disabled={!canMake}
                onClick={() => (recipe.type === 'cooking' ? handleCook(recipe) : handleFerment(recipe))}
              >
                {recipe.type === 'cooking' ? t('ui.crafting.cook') : t('ui.crafting.fermentBtn')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 50,
    right: 8,
    bottom: 52,
    width: 220,
    background: 'rgba(20,20,30,0.92)',
    borderRadius: 10,
    padding: 10,
    zIndex: 120,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    padding: '4px 0',
    border: 'none',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.1)',
    color: '#aaa',
    fontSize: 11,
    cursor: 'pointer',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
  },
  slotsSection: {
    marginBottom: 8,
    padding: 6,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
  },
  sectionLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  slotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 0',
  },
  slotName: {
    fontSize: 10,
    color: '#ddd',
    flex: 1,
  },
  slotProgress: {
    fontSize: 9,
    color: '#aaa',
  },
  collectBtn: {
    padding: '2px 6px',
    border: 'none',
    borderRadius: 3,
    background: '#4ade80',
    color: '#000',
    fontSize: 9,
    cursor: 'pointer',
  },
  recipeList: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  recipeRow: {
    padding: 6,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
  },
  recipeName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  ingredients: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginBottom: 4,
  },
  ingredient: {
    fontSize: 9,
    color: '#aaa',
  },
  fermentDays: {
    fontSize: 9,
    color: '#fbbf24',
    marginRight: 4,
  },
  craftBtn: {
    padding: '3px 8px',
    border: 'none',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 10,
    cursor: 'pointer',
  },
}

export default CraftingPanel
