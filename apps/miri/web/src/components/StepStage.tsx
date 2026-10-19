import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./StepStage.module.scss";

type Snapshot = { key: string; node: ReactNode };

const EXIT_MS = 220;

type Props = { stepKey: string; children: ReactNode };

/**
 * 페이지 교체가 아니라 같은 캔버스 위에서 질문이 바뀌는 느낌을 위해,
 * 키가 바뀌는 순간 직전 단계를 잠깐 남겨 퇴장시키고 새 단계를 등장시킨다.
 */
export default function StepStage({ stepKey, children }: Props) {
  const latest = useRef<Snapshot>({ key: stepKey, node: children });
  const [leaving, setLeaving] = useState<Snapshot | null>(null);

  // children 은 렌더마다 새 노드라 사실상 매 렌더 실행된다. 키가 바뀐 순간만 상태를 건드린다.
  useLayoutEffect(() => {
    if (latest.current.key !== stepKey) setLeaving(latest.current);
    latest.current = { key: stepKey, node: children };
  }, [stepKey, children]);

  useEffect(() => {
    if (!leaving) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => setLeaving(null),
      reduce ? 0 : EXIT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <div className={styles.stage}>
      {leaving ? (
        <div
          key={leaving.key}
          className={styles.leave}
          aria-hidden="true"
          inert
        >
          {leaving.node}
        </div>
      ) : null}
      <div key={stepKey} className={styles.enter}>
        {children}
      </div>
    </div>
  );
}
