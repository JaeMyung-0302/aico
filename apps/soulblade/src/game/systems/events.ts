import type { EventType } from '@soulblade/shared'
import { EVENT_TIMES, EVENT_MERCHANT_DURATION } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'

// 상인 아이템 정의
export interface MerchantItem {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly effect: 'heal' | 'atk_boost' | 'spd_boost' | 'shield'
  readonly value: number
}

const MERCHANT_POOL: readonly MerchantItem[] = [
  {
    id: 'heal_50',
    name: 'HP 회복',
    description: 'HP 50% 회복',
    effect: 'heal',
    value: 0.5,
  },
  {
    id: 'heal_full',
    name: '완전 회복',
    description: 'HP 100% 회복',
    effect: 'heal',
    value: 1.0,
  },
  {
    id: 'atk_boost',
    name: '공격력 강화',
    description: 'ATK +20% (영구)',
    effect: 'atk_boost',
    value: 0.2,
  },
  {
    id: 'spd_boost',
    name: '속도 강화',
    description: 'SPD +20% (영구)',
    effect: 'spd_boost',
    value: 0.2,
  },
  {
    id: 'shield_5s',
    name: '보호막',
    description: '5초 무적',
    effect: 'shield',
    value: 5000,
  },
  {
    id: 'shield_10s',
    name: '강화 보호막',
    description: '10초 무적',
    effect: 'shield',
    value: 10000,
  },
]

export interface EventState {
  triggeredEvents: Set<number> // Phaser game loop에서 성능상 mutable
}

export const createEventState = (): EventState => ({
  triggeredEvents: new Set(),
})

// 상인 아이템 3개 랜덤 생성
const generateMerchantItems = (): readonly MerchantItem[] => {
  const shuffled = [...MERCHANT_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

// 이벤트 타입 롤
const rollEventType = (): EventType => {
  const roll = Math.random()
  if (roll < 0.4) return 'merchant'
  if (roll < 0.7) return 'curse'
  return 'miniboss_rush'
}

/**
 * 매초 호출. EVENT_TIMES(7분/12분)에 이벤트 트리거
 */
export const checkEventTrigger = (
  state: EventState,
  elapsedSeconds: number,
): void => {
  for (const eventTime of EVENT_TIMES) {
    if (elapsedSeconds >= eventTime && !state.triggeredEvents.has(eventTime)) {
      state.triggeredEvents.add(eventTime)

      const type = rollEventType()

      if (type === 'merchant') {
        const items = generateMerchantItems()
        eventBus.emit('event:trigger', {
          type,
          data: { items, duration: EVENT_MERCHANT_DURATION },
        })
      } else {
        eventBus.emit('event:trigger', { type, data: {} })
      }
    }
  }
}

/**
 * 상인 아이템 효과를 반환 (GameScene에서 플레이어에 적용)
 */
export const getMerchantItemByIndex = (
  items: readonly MerchantItem[],
  index: number,
): MerchantItem | null => {
  if (index < 0 || index >= items.length) return null
  return items[index] ?? null
}
