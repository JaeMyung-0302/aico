import { useState, useCallback, useEffect, useRef } from 'react'
import classnames from 'classnames/bind'
import type { CharacterClass } from '@soulblade/shared'
import { CLASS_CONFIGS } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import styles from './ActiveSkillButton.module.scss'

const cx = classnames.bind(styles)

interface ActiveSkillButtonProps {
  readonly classType: CharacterClass
}

const SKILL_COOLDOWNS: Record<string, number> = {
  warrior_whirlwind: 8,
  archer_rain: 10,
  mage_meteor: 12,
  paladin_judgment: 10,
}

export const ActiveSkillButton = ({ classType }: ActiveSkillButtonProps) => {
  const config = CLASS_CONFIGS[classType]
  const skillId = config.activeSkillId
  const cooldownSec = SKILL_COOLDOWNS[skillId] ?? 10

  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const handleActivate = useCallback(() => {
    if (cooldownRemaining > 0) return

    eventBus.emit('skill:activate', { skillId })
    setCooldownRemaining(cooldownSec)
  }, [cooldownRemaining, skillId, cooldownSec])

  const isOnCooldown = cooldownRemaining > 0

  useEffect(() => {
    if (!isOnCooldown) return

    const id = window.setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 0.1))
    }, 100)

    return () => clearInterval(id)
  }, [isOnCooldown])

  const cooldownPercent = cooldownSec > 0 ? (cooldownRemaining / cooldownSec) * 100 : 0

  return (
    <button
      className={cx('skillButton', { cooldown: isOnCooldown })}
      onTouchStart={handleActivate}
      onClick={handleActivate}
    >
      <div
        className={cx('cooldownOverlay')}
        style={{ height: `${cooldownPercent}%` }}
      />
      <span className={cx('label')}>
        {isOnCooldown ? Math.ceil(cooldownRemaining) : 'SKILL'}
      </span>
    </button>
  )
}
