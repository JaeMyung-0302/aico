import type { ReactNode } from "react";
import styles from "./Canvas.module.scss";

type Props = {
  /** 헤더 슬롯. 워드마크·진행점·오브가 들어간다. */
  header?: ReactNode;
  /** 헤더 아래 화면 전환 슬롯. 온보딩에는 없다. */
  nav?: ReactNode;
  /** 화면 중앙(하단 무게중심) 슬롯. 질문·확인 문구. */
  children?: ReactNode;
  /** 엄지 도달 범위에 고정되는 하단 슬롯. 버튼·에러. */
  dock?: ReactNode;
  /** 확인 시 후광이 한 번 더 밝아진다. */
  lit?: boolean;
  /** 흐름 화면처럼 위에서부터 읽는 화면. 기본은 하단 무게중심. */
  top?: boolean;
};

/** 모든 화면이 공유하는 캔버스. 단계가 바뀌어도 이 캔버스는 그대로 남는다. */
export default function Canvas({
  header,
  nav,
  children,
  dock,
  lit = false,
  top = false,
}: Props) {
  return (
    <main className={styles.canvas}>
      <div
        className={`${styles.halo} ${lit ? styles.haloLit : ""}`}
        aria-hidden="true"
      />
      <div className={styles.frame}>
        <header className={styles.header}>{header}</header>
        {/* 그리드 행 수를 고정하려고 nav 가 없어도 자리는 남긴다. */}
        <div className={`${styles.nav} ${nav ? "" : styles.navEmpty}`}>{nav}</div>
        <section className={`${styles.body} ${top ? styles.bodyTop : ""}`}>
          {children}
        </section>
        <div className={styles.dock}>{dock}</div>
      </div>
    </main>
  );
}
