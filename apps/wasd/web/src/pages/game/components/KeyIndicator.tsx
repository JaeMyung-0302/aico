import { useState, useEffect, useCallback } from 'react'
import classNames from 'classnames/bind'
import type { Key } from '@wasd/shared'
import styles from './KeyIndicator.module.scss'

const cx = classNames.bind(styles)

const ALL_KEYS: Key[] = ['w', 'a', 's', 'd']

const KEY_TO_DIRECTION: Record<string, Key> = {
  w: 'w',
  a: 'a',
  s: 's',
  d: 'd',
  arrowup: 'w',
  arrowleft: 'a',
  arrowdown: 's',
  arrowright: 'd',
}

interface KeyIndicatorProps {
  myKeys: Key[]
}

const KeyIndicator = ({ myKeys }: KeyIndicatorProps) => {
  const myKeysSet = new Set(myKeys)
  const [pressedKeys, setPressedKeys] = useState<Set<Key>>(new Set())

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = KEY_TO_DIRECTION[e.key.toLowerCase()]
    if (key) {
      setPressedKeys((prev) => {
        if (prev.has(key)) return prev
        const next = new Set(prev)
        next.add(key)
        return next
      })
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = KEY_TO_DIRECTION[e.key.toLowerCase()]
    if (key) {
      setPressedKeys((prev) => {
        if (!prev.has(key)) return prev
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const renderKey = (key: Key) => {
    const isActive = myKeysSet.has(key)
    const isPressed = isActive && pressedKeys.has(key)
    return (
      <div
        key={key}
        data-key={isActive ? key : undefined}
        className={cx('key', {
          active: isActive,
          pressed: isPressed,
          disabled: !isActive,
        })}
      >
        {key.toUpperCase()}
      </div>
    )
  }

  return (
    <div className={cx('container')}>
      <div className={cx('row')}>{renderKey('w')}</div>
      <div className={cx('row')}>
        {ALL_KEYS.filter((k) => k !== 'w').map(renderKey)}
      </div>
    </div>
  )
}

export default KeyIndicator
