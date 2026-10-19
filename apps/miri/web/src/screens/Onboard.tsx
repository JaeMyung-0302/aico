import { useState } from "react";
import { enableNotifications, isIos, isStandalone } from "../push-client.ts";
import Button from "../components/Button.tsx";
import Canvas from "../components/Canvas.tsx";
import Orb from "../components/Orb.tsx";
import { ErrorNote } from "../components/Prompt.tsx";
import TimePicker from "../components/TimePicker.tsx";
import { TRACK_IDS, TRACKS, type TrackId } from "../domain.ts";
import { describeTime } from "./options.ts";
import styles from "./Onboard.module.scss";

const DEFAULT_TIME = "21:00";
const DEFAULT_TRACKS: TrackId[] = ["exercise"];

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

/** 물어볼 분야. 여러 개 고를 수 있고 하나는 남아야 한다. */
function TrackPicker({
  selected,
  onToggle,
  disabled,
}: {
  selected: TrackId[];
  onToggle: (track: TrackId) => void;
  disabled: boolean;
}) {
  return (
    <div className={styles.tracks} role="group" aria-label="물어볼 것">
      {TRACK_IDS.map((track) => {
        const on = selected.includes(track);
        return (
          <button
            key={track}
            type="button"
            aria-pressed={on}
            className={`${styles.track} ${on ? styles.trackOn : ""}`}
            disabled={disabled}
            onClick={() => onToggle(track)}
          >
            {TRACKS[track].name}
          </button>
        );
      })}
    </div>
  );
}

export default function Onboard({
  onEnabled,
}: {
  onEnabled: (userId: string) => void;
}) {
  const [tracks, setTracks] = useState<TrackId[]>(DEFAULT_TRACKS);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsInstall = isIos() && !isStandalone();

  const handleTrackToggle = (track: TrackId) => {
    setTracks((prev) => {
      if (prev.includes(track)) return prev.length > 1 ? prev.filter((t) => t !== track) : prev;
      return TRACK_IDS.filter((id) => id === track || prev.includes(id));
    });
  };

  const handleEnableClick = async () => {
    setBusy(true);
    setError(null);
    try {
      onEnabled(
        await enableNotifications(tracks.map((track) => ({ track, notifyAt: time }))),
      );
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
              <TrackPicker selected={tracks} onToggle={handleTrackToggle} disabled={busy} />
              <TimePicker value={time} onChange={setTime} disabled={busy} />
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
          매일 {describeTime(time)}에 먼저 물어봅니다.
          <br />
          버튼만 누르면 끝나요.
        </p>
        <p className={styles.note}>시간은 나중에 분야마다 따로 바꿀 수 있어요.</p>
      </div>
    </Canvas>
  );
}
