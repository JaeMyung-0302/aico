import styles from './PatternCard.module.scss';

interface Pattern {
  name: string;
  count: number;
  total: number;
  ratio: number;
  description: string;
  severity: string;
}

interface Props {
  pattern: Pattern;
}

const severityIcon = (severity: string) => {
  if (severity === 'CRITICAL') return '🔴';
  if (severity === 'WARNING') return '🟡';
  return '🟢';
};

const PatternCard = ({ pattern }: Props) => {
  return (
    <div className={`${styles.card} ${styles[pattern.severity.toLowerCase()] ?? ''}`}>
      <div className={styles.header}>
        <span>{severityIcon(pattern.severity)}</span>
        <span className={styles.name}>{pattern.name}</span>
        <span className={styles.count}>{pattern.count}/{pattern.total}회</span>
        <span className={styles.ratio}>({(pattern.ratio * 100).toFixed(0)}%)</span>
      </div>
      <p className={styles.description}>{pattern.description}</p>
    </div>
  );
};

export default PatternCard;
