import type { StageBattleResponse } from '@monster-factory/shared'
import styles from './StageResultModal.module.scss'

interface StageResultModalProps {
  result: StageBattleResponse
  onClose: () => void
}

export const StageResultModal = ({ result, onClose }: StageResultModalProps) => {
  const isWin = result.winner === 'player'

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{isWin ? '승리!' : '패배...'}</h2>

        <p className={styles.stageInfo}>
          {result.chapterName} - Stage {result.stageNumber}
        </p>

        {isWin && (
          <>
            <div className={styles.stars}>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={i < result.stars ? styles.starFilled : styles.starEmpty}>
                  {i < result.stars ? '★' : '☆'}
                </span>
              ))}
            </div>

            <div className={styles.rewards}>
              <div className={styles.rewardItem}>
                <span className={styles.rewardLabel}>골드</span>
                <span className={styles.rewardValue}>+{result.totalGoldReward}</span>
              </div>
              {result.summonStonesReward > 0 && (
                <div className={styles.rewardItem}>
                  <span className={styles.rewardLabel}>소환석</span>
                  <span className={styles.rewardValue}>+{result.summonStonesReward}</span>
                </div>
              )}
            </div>
          </>
        )}

        {result.synergyBonus && (
          <p className={styles.synergy}>시너지: {result.synergyBonus.type}</p>
        )}

        <button className={styles.closeBtn} onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  )
}
