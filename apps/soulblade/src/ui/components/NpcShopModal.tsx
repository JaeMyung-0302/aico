import classnames from 'classnames/bind'
import type { ShopItem } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { SHOP_ITEMS } from '@/game/data/npc-shop-items'
import styles from './NpcShopModal.module.scss'

const cx = classnames.bind(styles)

interface NpcShopModalProps {
  readonly gold: number
  readonly onClose: () => void
}

export const NpcShopModal = ({ gold, onClose }: NpcShopModalProps) => {
  const handleBuy = (item: ShopItem) => {
    if (gold < item.cost) return
    eventBus.emit('npc:buy', { itemId: item.id, cost: item.cost })
  }

  const handleClose = () => {
    eventBus.emit('npc:close')
    onClose()
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <div className={cx('header')}>
          <h2 className={cx('title')}>잡화 상인</h2>
          <span className={cx('gold')}>소지금: {gold}G</span>
        </div>
        <ul className={cx('itemList')}>
          {SHOP_ITEMS.map((item) => (
            <li key={item.id} className={cx('item')}>
              <div className={cx('itemInfo')}>
                <span className={cx('itemName')}>{item.name}</span>
                <span className={cx('itemDesc')}>{item.description}</span>
              </div>
              <button
                className={cx('buyBtn', { disabled: gold < item.cost })}
                onClick={() => handleBuy(item)}
                disabled={gold < item.cost}
              >
                {item.cost}G
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
