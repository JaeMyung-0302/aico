import styles from './LoadingSkeleton.module.scss';

interface Props {
  width?: string;
  height?: string;
  count?: number;
}

const LoadingSkeleton = ({ width = '100%', height = '20px', count = 1 }: Props) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className={styles.skeleton}
        style={{ width, height }}
      />
    ))}
  </>
);

export default LoadingSkeleton;
