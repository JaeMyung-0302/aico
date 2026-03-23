import type { IndicatorScore } from '@/types/analysis';
import styles from './IndicatorBreakdown.module.scss';

interface Props {
  breakdown: IndicatorScore[];
}

const IndicatorBreakdown = ({ breakdown }: Props) => (
  <div className={styles.list}>
    {breakdown.map((item) => (
      <div key={item.name} className={styles.row}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.badge} data-direction={item.direction}>
          {item.direction}
        </span>
        <div className={styles.bar}>
          <div
            className={styles.fill}
            style={{
              width: `${Math.min(Math.abs(item.value), 100) / 2}%`,
              background: item.value > 0 ? '#22c55e' : item.value < 0 ? '#ef4444' : '#6b7280',
              marginLeft: item.value < 0 ? 'auto' : undefined,
            }}
          />
        </div>
        <span className={styles.value}>{item.value.toFixed(1)}</span>
      </div>
    ))}
  </div>
);

export default IndicatorBreakdown;
