"use client";

import styles from "@/styles/error.module.scss";

interface ErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorProps) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>문제가 발생했습니다</h2>
      <p className={styles.message}>{error.message}</p>
      <button type="button" className={styles.button} onClick={reset}>
        다시 시도
      </button>
    </div>
  );
};

export default ErrorPage;
