import classnames from 'classnames/bind'
import type { PassiveSkillId } from '@soulblade/shared'
import { getPassiveSkill } from '@/game/systems/skills'
import styles from './SkillPanel.module.scss'

const cx = classnames.bind(styles)

interface SkillPanelProps {
  readonly skills: ReadonlyArray<{ readonly id: PassiveSkillId; readonly level: number }>
  readonly onClose: () => void
}

export const SkillPanel = ({ skills, onClose }: SkillPanelProps) => {
  return (
    <div className={cx('panel')}>
      <div className={cx('header')}>
        <h3 className={cx('title')}>스킬</h3>
        <button className={cx('closeBtn')} onClick={onClose}>X</button>
      </div>
      <div className={cx('content')}>
        {skills.length === 0 ? (
          <p className={cx('empty')}>습득한 스킬 없음</p>
        ) : (
          skills.map(({ id, level }) => {
            const skill = getPassiveSkill(id)
            return (
              <div key={id} className={cx('skillRow')}>
                <span className={cx('icon')}>{skill.icon}</span>
                <span className={cx('name')}>{skill.name}</span>
                <span className={cx('level')}>Lv.{level}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
