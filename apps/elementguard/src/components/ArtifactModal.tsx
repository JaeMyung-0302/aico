import type { ArtifactData } from '@/types'
import classNames from 'classnames/bind'
import styles from './ArtifactModal.module.scss'

const cx = classNames.bind(styles)

interface ArtifactModalProps {
  artifacts: ArtifactData[]
  onSelect: (artifactId: string) => void
}

export const ArtifactModal = ({ artifacts, onSelect }: ArtifactModalProps) => (
  <div className={cx('overlay')}>
    <div className={cx('modal')}>
      <h2 className={cx('title')}>유물 선택</h2>
      <p className={cx('subtitle')}>3개 중 1개를 선택하세요</p>
      <div className={cx('cards')}>
        {artifacts.map((artifact) => (
          <button
            key={artifact.id}
            className={cx('card', artifact.rarity)}
            onClick={() => onSelect(artifact.id)}
          >
            <span className={cx('rarity')}>
              {artifact.rarity === 'epic' ? '전설' : artifact.rarity === 'rare' ? '희귀' : '일반'}
            </span>
            <span className={cx('name')}>{artifact.name}</span>
            <span className={cx('category')}>{artifact.category}</span>
            <p className={cx('description')}>{artifact.description}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
)
