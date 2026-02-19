import classnames from 'classnames/bind'
import type { ForgeRecipe } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { FORGE_RECIPES } from '@/game/data/npc-shop-items'
import styles from './NpcForgeModal.module.scss'

const cx = classnames.bind(styles)

interface NpcForgeModalProps {
  readonly gold: number
  readonly onClose: () => void
}

export const NpcForgeModal = ({ gold, onClose }: NpcForgeModalProps) => {
  const handleForge = (recipe: ForgeRecipe) => {
    if (gold < recipe.cost) return
    eventBus.emit('npc:forge', { equipmentId: recipe.id, cost: recipe.cost })
  }

  const handleClose = () => {
    eventBus.emit('npc:close')
    onClose()
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <div className={cx('header')}>
          <h2 className={cx('title')}>대장간</h2>
          <span className={cx('gold')}>소지금: {gold}G</span>
        </div>
        <ul className={cx('recipeList')}>
          {FORGE_RECIPES.map((recipe) => (
            <li key={recipe.id} className={cx('recipe')}>
              <div className={cx('recipeInfo')}>
                <span className={cx('recipeName')}>{recipe.name}</span>
                <span className={cx('recipeDesc')}>{recipe.description}</span>
              </div>
              <button
                className={cx('forgeBtn', { disabled: gold < recipe.cost })}
                onClick={() => handleForge(recipe)}
                disabled={gold < recipe.cost}
              >
                {recipe.cost}G
              </button>
            </li>
          ))}
        </ul>
        <button className={cx('closeBtn')} onClick={handleClose}>
          닫기
        </button>
      </div>
    </div>
  )
}
