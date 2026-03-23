import styles from './LlmInterpretation.module.scss';

interface Props {
  interpretation: string;
}

const LlmInterpretation = ({ interpretation }: Props) => {
  if (!interpretation) return null;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>AI 분석 해석</h3>
      <div className={styles.content}>
        {interpretation.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <p className={styles.disclaimer}>
        본 해석은 기술적 지표 계산 결과를 요약한 것이며, 투자 자문이 아닙니다.
      </p>
    </div>
  );
};

export default LlmInterpretation;
