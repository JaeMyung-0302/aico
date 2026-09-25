import { useState } from "react";
import { enableNotifications, isIos, isStandalone } from "../push-client.ts";
import Button from "../components/Button.tsx";
import Canvas from "../components/Canvas.tsx";
import Orb from "../components/Orb.tsx";
import { ErrorNote } from "../components/Prompt.tsx";
import SlotPicker from "../components/SlotPicker.tsx";
import type { NotifySlot } from "../domain.ts";
import { describeSlot } from "./options.ts";
import styles from "./Onboard.module.scss";

const DEFAULT_SLOT: NotifySlot = "21:00";

const INSTALL_STEPS = [
  "공유 버튼",
  "홈 화면에 추가",
  "홈 화면 아이콘으로 다시 열기",
];

function InstallNotice() {
  return (
    <div className={styles.notice}>
      <strong className={styles.noticeTitle}>
        iPhone은 홈 화면에 추가해야 알림이 옵니다.
      </strong>
      <ol className={styles.steps}>
        {INSTALL_STEPS.map((step, index) => (
          <li key={step} className={styles.step}>
            <span className={styles.stepNo}>{index + 1}</span>
            <span className={index === 1 ? styles.stepKey : undefined}>
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Onboard({
  onEnabled,
}: {
  onEnabled: (userId: string) => void;
}) {
  const [slot, setSlot] = useState<NotifySlot>(DEFAULT_SLOT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsInstall = isIos() && !isStandalone();

  const handleEnableClick = async () => {
    setBusy(true);
    setError(null);
    try {
      onEnabled(await enableNotifications(slot));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "알 수 없는 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Canvas
      dock={
        <>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {needsInstall ? (
            <InstallNotice />
          ) : (
            <>
              <SlotPicker value={slot} onChange={setSlot} disabled={busy} />
              <Button onClick={handleEnableClick} disabled={busy} busy={busy}>
                {busy ? "연결 중…" : "알림 받기"}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className={styles.hero}>
        <Orb size="lg" />
        <h1 className={styles.brand}>Miri</h1>
        <p className={styles.lede}>
          매일 {describeSlot(slot)}에 한 번 물어봅니다.
          <br />
          버튼만 누르면 끝나요.
        </p>
      </div>
    </Canvas>
  );
}
