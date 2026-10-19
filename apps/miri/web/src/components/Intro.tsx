import { useEffect, useState } from "react";
import Orb from "./Orb.tsx";
import styles from "./Intro.module.scss";

const INTRO_KEY = "miri.intro";
const TOTAL_MS = 900;

/** 이번 앱 실행에서 이미 보였는지. 화면 전환마다 다시 뜨지 않게 한다. */
function shouldPlay(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (sessionStorage.getItem(INTRO_KEY)) return false;
    sessionStorage.setItem(INTRO_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * 첫 진입 0.9초. 오브가 맺히고 워드마크가 떠오른 뒤 걷힌다.
 * 화면은 밑에서 이미 그려지고 있고 오버레이는 터치를 막지 않는다.
 */
export default function Intro() {
  const [playing, setPlaying] = useState(shouldPlay);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setPlaying(false), TOTAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing]);

  if (!playing) return null;
  return (
    <div className={styles.veil} aria-hidden="true">
      <div className={styles.stage}>
        <span className={styles.ring} />
        <span className={styles.orb}>
          <Orb size="lg" />
        </span>
        <span className={styles.wordmark}>Miri</span>
      </div>
    </div>
  );
}
