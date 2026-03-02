import Link from "next/link";
import styles from "@/styles/error.module.scss";

const NotFound = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>페이지를 찾을 수 없습니다</h2>
      <p className={styles.message}>요청하신 페이지가 존재하지 않습니다.</p>
      <Link href="/" className={styles.button}>
        홈으로 돌아가기
      </Link>
    </div>
  );
};

export default NotFound;
