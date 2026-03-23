import styles from './SignalCard.module.scss';

interface SignalLog {
  id: number;
  symbol: string;
  type: string;
  direction: string;
  value: number;
  threshold: number;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  signal: SignalLog;
  onMarkRead?: (id: number) => void;
}

const directionIcon = (direction: string) => {
  if (direction === 'BULLISH') return '📈';
  if (direction === 'BEARISH') return '📉';
  return '📊';
};

const directionClass = (direction: string) => {
  if (direction === 'BULLISH') return styles.bullish;
  if (direction === 'BEARISH') return styles.bearish;
  return styles.neutral;
};

const SignalCard = ({ signal, onMarkRead }: Props) => {
  const isUnread = !signal.readAt;

  return (
    <div className={`${styles.card} ${isUnread ? styles.unread : ''}`}>
      <div className={styles.header}>
        <span className={styles.symbol}>{signal.symbol}</span>
        <span className={directionClass(signal.direction)}>
          {directionIcon(signal.direction)} {signal.direction}
        </span>
        <span className={styles.time}>
          {new Date(signal.createdAt).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <p className={styles.message}>{signal.message}</p>
      {isUnread && onMarkRead && (
        <button
          className={styles.readButton}
          onClick={() => onMarkRead(signal.id)}
        >
          읽음
        </button>
      )}
    </div>
  );
};

export default SignalCard;
