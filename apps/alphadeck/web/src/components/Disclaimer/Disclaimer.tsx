import styles from './Disclaimer.module.scss';

const Disclaimer = () => (
  <div className={styles.disclaimer}>
    본 서비스는 투자 자문이 아닙니다. 제공되는 모든 정보는 기술적 분석 계산 결과이며,
    투자 판단은 사용자 본인의 책임입니다.
  </div>
);

export default Disclaimer;
