import { useEffect, useState, useMemo } from 'react'
import classNames from 'classnames/bind'
import { api } from '@/lib/api'
import { ExpiryBadge } from '@/components/ExpiryBadge'
import { ExpiryStatus, getExpiryStatus, FOOD_CATEGORY_LABELS } from '@/types'
import type { FoodItemResponse } from '@/types'
import styles from './AlertsPage.module.scss'

const cx = classNames.bind(styles)

interface AlertGroup {
  status: ExpiryStatus
  label: string
  dotClass: string
  items: FoodItemResponse[]
}

export const AlertsPage = () => {
  const [allItems, setAllItems] = useState<FoodItemResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true)
      try {
        const items = await api.get<FoodItemResponse[]>('/alerts')
        setAllItems(items)
      } catch {
        // API 실패 시 빈 목록
        setAllItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  const alertGroups = useMemo((): AlertGroup[] => {
    const groups: AlertGroup[] = [
      { status: ExpiryStatus.EXPIRED, label: '기한 만료', dotClass: 'dotExpired', items: [] },
      { status: ExpiryStatus.DANGER, label: 'D-1 이하', dotClass: 'dotDanger', items: [] },
      { status: ExpiryStatus.WARNING, label: 'D-3 이하', dotClass: 'dotWarning', items: [] },
    ]

    for (const item of allItems) {
      const status = getExpiryStatus(item.expiryDate)
      const group = groups.find((g) => g.status === status)
      if (group) {
        group.items = [...group.items, item]
      }
    }

    return groups.filter((g) => g.items.length > 0)
  }, [allItems])

  if (loading) {
    return (
      <div className={cx('page')}>
        <h1 className={cx('title')}>유통기한 알림</h1>
        <div className={cx('loading')}>불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className={cx('page')}>
      <h1 className={cx('title')}>유통기한 알림</h1>

      {alertGroups.length === 0 && (
        <div className={cx('empty')}>
          <span className={cx('emptyIcon')}>✅</span>
          <p className={cx('emptyText')}>
            유통기한이 임박한 식재료가 없어요.
            <br />
            잘 관리하고 계시네요!
          </p>
        </div>
      )}

      {alertGroups.map((group) => (
        <div key={group.status} className={cx('group', {
            groupExpired: group.status === ExpiryStatus.EXPIRED,
            groupDanger: group.status === ExpiryStatus.DANGER,
            groupWarning: group.status === ExpiryStatus.WARNING,
          })}>
          <div className={cx('groupHeader')}>
            <span className={cx('groupDot', group.dotClass)} />
            <span className={cx('groupLabel')}>{group.label}</span>
            <span className={cx('groupCount')}>{group.items.length}개</span>
          </div>

          {group.items.map((item) => (
            <div key={item.id} className={cx('alertItem')}>
              <div className={cx('alertInfo')}>
                <div className={cx('alertName')}>{item.name}</div>
                <div className={cx('alertMeta')}>
                  {FOOD_CATEGORY_LABELS[item.category]}
                </div>
              </div>
              <ExpiryBadge expiryDate={item.expiryDate} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
