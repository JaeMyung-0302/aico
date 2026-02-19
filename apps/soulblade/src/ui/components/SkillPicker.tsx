import classnames from 'classnames/bind'
import type { InRunSkillChoice } from '@soulblade/shared'
import { getPassiveSkill } from '@/game/systems/skills'
import { eventBus } from '@/lib/event-bus'
import styles from './SkillPicker.module.scss'

const cx = classnames.bind(styles)

interface SkillPickerProps {
  readonly choices: readonly InRunSkillChoice[]
  readonly level: number
  readonly onClose: () => void
}

export const SkillPicker = ({ choices, level, onClose }: SkillPickerProps) => {
  const handleSelect = (choice: InRunSkillChoice) => {
    eventBus.emit('skill:selected', { skillId: choice.skillId })
    onClose()
    eventBus.emit('game:resume')
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('container')}>
        <h2 className={cx('title')}>Level {level}!</h2>
        <p className={cx('subtitle')}>스킬을 선택하세요</p>
        <div className={cx('cards')}>
          {choices.map((choice) => {
            const skill = getPassiveSkill(choice.skillId)
            return (
              <button
                key={choice.skillId}
                className={cx('card')}
                onClick={() => handleSelect(choice)}
              >
                <span className={cx('icon')}>{skill.icon}</span>
                <span className={cx('name')}>{skill.name}</span>
                <span className={cx('desc')}>{skill.description}</span>
                <span className={cx('level')}>
                  Lv.{choice.currentLevel} → Lv.{choice.nextLevel}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
