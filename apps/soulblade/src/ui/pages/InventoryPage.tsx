import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { Equipment, EquipmentType, EquipmentGrade } from '@soulblade/shared'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCharacterStore } from '@/stores/useCharacterStore'
import { calcEquipmentSynergies } from '@/game/systems/synergy'
import { EquipmentSlot } from '@/ui/components/EquipmentSlot'
import styles from './InventoryPage.module.scss'

const cx = classnames.bind(styles)

const SLOTS: EquipmentType[] = ['weapon', 'armor', 'accessory']

const GRADE_ORDER: Record<EquipmentGrade, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
}

export const InventoryPage = () => {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id)
  const items = useInventoryStore((s) => s.items)
  const fetchInventory = useInventoryStore((s) => s.fetchInventory)
  const equipItem = useInventoryStore((s) => s.equipItem)
  const unequipItem = useInventoryStore((s) => s.unequipItem)
  const getEquippedItems = useInventoryStore((s) => s.getEquippedItems)
  const getEquippedBySlot = useInventoryStore((s) => s.getEquippedBySlot)

  // 임시 캐릭터 ID (실제로는 선택된 캐릭터)
  const characterId = 'current'
  const [selectedSlot, setSelectedSlot] = useState<EquipmentType | null>(null)

  useEffect(() => {
    if (userId) {
      fetchInventory()
    }
  }, [userId, fetchInventory])

  const equippedItems = getEquippedItems(characterId)
  const synergies = calcEquipmentSynergies(equippedItems)
  const activeSynergies = synergies.filter((s) => s.active)

  // 선택된 슬롯에 맞는 미장착 장비 목록
  const availableForSlot = selectedSlot
    ? [...items]
        .filter((i) => i.type === selectedSlot && i.equippedBy !== characterId)
        .sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade])
    : []

  const handleSlotTap = (slotType: EquipmentType) => {
    const equipped = getEquippedBySlot(characterId, slotType)
    if (equipped && selectedSlot === slotType) {
      // 이미 선택된 슬롯 재탭 → 해제
      unequipItem(equipped.id)
      setSelectedSlot(null)
    } else {
      setSelectedSlot(slotType)
    }
  }

  const handleEquip = (item: Equipment) => {
    equipItem(item.id, characterId)
    setSelectedSlot(null)
  }

  return (
    <div className={cx('page')}>
      <header className={cx('header')}>
        <button className={cx('backBtn')} onClick={() => navigate('/')}>
          ←
        </button>
        <h1 className={cx('title')}>인벤토리</h1>
      </header>

      <section className={cx('equipped')}>
        <h2 className={cx('sectionTitle')}>장착 장비</h2>
        <div className={cx('slots')}>
          {SLOTS.map((slot) => (
            <EquipmentSlot
              key={slot}
              slotType={slot}
              item={getEquippedBySlot(characterId, slot)}
              onTap={handleSlotTap}
            />
          ))}
        </div>
      </section>

      {activeSynergies.length > 0 && (
        <section className={cx('synergies')}>
          <h3 className={cx('synergyTitle')}>시너지 보너스</h3>
          {activeSynergies.map((s) => (
            <div key={s.tag} className={cx('synergyItem')}>
              <span className={cx('synergyTag')}>{s.tag} {s.count}세트</span>
              <span className={cx('synergyBonus')}>
                {Object.entries(s.bonus).map(([k, v]) => `${k.toUpperCase()}+${v}`).join(' ')}
              </span>
            </div>
          ))}
        </section>
      )}

      {selectedSlot && (
        <section className={cx('itemList')}>
          <h2 className={cx('sectionTitle')}>{selectedSlot} 선택</h2>
          {availableForSlot.length === 0 ? (
            <p className={cx('empty')}>장비가 없습니다</p>
          ) : (
            <div className={cx('grid')}>
              {availableForSlot.map((item) => (
                <button
                  key={item.id}
                  className={cx('itemCard')}
                  onClick={() => handleEquip(item)}
                >
                  <span className={cx('itemName')}>{item.name}</span>
                  <span className={cx('itemStats')}>
                    {Object.entries(item.stats).map(([k, v]) => (
                      <span key={k}>{k.toUpperCase()}+{v} </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
