import styles from './SignalScoreGauge.module.scss';

interface Props {
  score: number;
}

const SignalScoreGauge = ({ score }: Props) => {
  const normalized = (score + 100) / 200; // 0 ~ 1
  const rotation = normalized * 180 - 90; // -90 ~ 90 degrees
  const color = score >= 30 ? '#22c55e' : score <= -30 ? '#ef4444' : '#f59e0b';

  return (
    <div className={styles.gauge}>
      <svg viewBox="0 0 200 120" className={styles.svg}>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#334155"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${normalized * 251.2} 251.2`}
        />
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.cos((rotation * Math.PI) / 180)}
          y2={100 - 60 * Math.sin((-rotation * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill={color} />
      </svg>
      <div className={styles.value} style={{ color }}>
        {score > 0 ? '+' : ''}{score}
      </div>
    </div>
  );
};

export default SignalScoreGauge;
