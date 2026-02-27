import { useEffect, useState } from 'react'
import classnames from 'classnames/bind'
import { eventBus } from '@/lib/event-bus'
import styles from './HUD.module.scss'

const cx = classnames.bind(styles)

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const HUD = () => {
  const [hp, setHp] = useState(0)
  const [maxHp, setMaxHp] = useState(1)
  const [level, setLevel] = useState(1)
  const [exp, setExp] = useState(0)
  const [expToNext, setExpToNext] = useState(100)
  const [killCount, setKillCount] = useState(0)
  const [timer, setTimer] = useState(0)
  const [mapName, setMapName] = useState('')

  useEffect(() => {
    const onStats = (data: {
      hp: number
      maxHp: number
      level: number
      exp: number
      expToNext: number
    }) => {
      setHp(data.hp)
      setMaxHp(data.maxHp)
      setLevel(data.level)
      setExp(data.exp)
      setExpToNext(data.expToNext)
    }

    const onKill = (data: { count: number }) => {
      setKillCount(data.count)
    }

    const onTimer = (data: { seconds: number }) => {
      setTimer(data.seconds)
    }

    const onMapName = (data: { name: string }) => {
      setMapName(data.name)
    }

    eventBus.on('player:statsUpdate', onStats)
    eventBus.on('hud:killCount', onKill)
    eventBus.on('hud:timer', onTimer)
    eventBus.on('hud:mapName', onMapName)

    return () => {
      eventBus.off('player:statsUpdate', onStats)
      eventBus.off('hud:killCount', onKill)
      eventBus.off('hud:timer', onTimer)
      eventBus.off('hud:mapName', onMapName)
    }
  }, [])

  const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0
  const expPercent = expToNext > 0 ? (exp / expToNext) * 100 : 0

  return (
    <div className={cx('hud')}>
      <div className={cx('topBar')}>
        <div className={cx('hpBar')}>
          <div className={cx('hpFill')} style={{ width: `${hpPercent}%` }} />
          <span className={cx('hpText')}>
            {Math.floor(hp)} / {Math.floor(maxHp)}
          </span>
        </div>
        <div className={cx('expBar')}>
          <div className={cx('expFill')} style={{ width: `${expPercent}%` }} />
          <span className={cx('expText')}>Lv.{level}</span>
        </div>
      </div>
      <div className={cx('stats')}>
        {mapName && <span className={cx('mapName')}>{mapName}</span>}
        <span className={cx('timer')}>{formatTime(timer)}</span>
        <span className={cx('kills')}>x{killCount}</span>
      </div>
    </div>
  )
}
