import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  deleteMe,
  fetchMe,
  UnknownUserError,
  updateMe,
  type Settings as SettingsData,
  type TrackPatch,
} from "../api.ts";
import Button from "../components/Button.tsx";
import Canvas from "../components/Canvas.tsx";
import { LoggerHeader } from "../components/Header.tsx";
import { ErrorNote, Question } from "../components/Prompt.tsx";
import TimePicker from "../components/TimePicker.tsx";
import Toggle from "../components/Toggle.tsx";
import {
  TRACKS,
  WEEKDAY_LABELS,
  type TrackSettings,
} from "../domain.ts";
import { describeTime } from "./options.ts";
import styles from "./Settings.module.scss";

/** 쉬는 요일. 켜진 칩이 쉬는 날이다. */
function OffDays({
  value,
  onChange,
  disabled,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  disabled: boolean;
}) {
  return (
    <div className={styles.days} role="group" aria-label="쉬는 요일">
      {WEEKDAY_LABELS.map((label, day) => {
        const off = value.includes(day);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={off}
            className={`${styles.day} ${off ? styles.dayOff : ""}`}
            disabled={disabled}
            onClick={() =>
              onChange(off ? value.filter((d) => d !== day) : [...value, day].sort())
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TrackCard({
  settings,
  busy,
  onPatch,
}: {
  settings: TrackSettings;
  busy: boolean;
  onPatch: (patch: Omit<TrackPatch, "track">) => void;
}) {
  const track = TRACKS[settings.track];
  return (
    <section className={`${styles.card} ${settings.enabled ? "" : styles.cardOff}`}>
      <Toggle
        label={track.name}
        hint={settings.enabled ? describeTime(settings.notifyAt) : "묻지 않아요"}
        checked={settings.enabled}
        disabled={busy}
        onChange={(enabled) => onPatch({ enabled })}
      />
      {settings.enabled ? (
        <div className={styles.cardBody}>
          <TimePicker
            value={settings.notifyAt}
            onChange={(notifyAt) => onPatch({ notifyAt })}
            disabled={busy}
          />
          <div className={styles.field}>
            <span className={styles.fieldLabel}>쉬는 요일</span>
            <OffDays
              value={settings.offDays}
              onChange={(offDays) => onPatch({ offDays })}
              disabled={busy}
            />
          </div>
          <Toggle
            label="90분 뒤 한 번 더"
            hint="답이 없으면 한 번만 다시 알려요"
            checked={settings.remind}
            disabled={busy}
            onChange={(remind) => onPatch({ remind })}
          />
        </div>
      ) : null}
    </section>
  );
}

/** 설정. 전체 멈춤, 트랙마다 켬과 시각과 쉬는 요일과 재알림, 데이터 지우기. */
export default function Settings({
  userId,
  onExpired,
  nav,
}: {
  userId: string;
  onExpired: () => void;
  nav: ReactNode;
}) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const fail = useCallback(
    (cause: unknown, message: string) => {
      if (cause instanceof UnknownUserError) {
        onExpired();
        return;
      }
      setError(message);
    },
    [onExpired],
  );

  useEffect(() => {
    let cancelled = false;
    fetchMe(userId)
      .then((result) => {
        if (!cancelled) setSettings(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) fail(cause, "설정을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, fail]);

  const patch = async (change: { paused?: boolean; tracks?: TrackPatch[] }) => {
    setBusy(true);
    setError(null);
    try {
      setSettings(await updateMe(userId, change));
    } catch (cause) {
      fail(cause, "저장하지 못했어요. 다시 눌러주세요");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteMe(userId);
      onExpired();
    } catch (cause) {
      fail(cause, "지우지 못했어요. 다시 눌러주세요");
      setBusy(false);
    }
  };

  const enabledCount = settings?.tracks.filter((item) => item.enabled).length ?? 0;
  const summary = settings
    ? settings.paused
      ? "알림이 멈춰 있어요"
      : enabledCount === 0
        ? "물어볼 것이 없어요"
        : `${enabledCount}가지를 물어봐요`
    : null;

  return (
    <Canvas
      top
      header={<LoggerHeader progress={null} />}
      nav={nav}
      dock={
        <>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {confirmingDelete ? (
            <p className={styles.warn} role="status">
              기록, 질문, 알림 구독이 모두 지워지고 처음으로 돌아가요
            </p>
          ) : null}
          <div className={styles.dangerRow}>
            <Button
              variant="ghost"
              onClick={handleDeleteClick}
              disabled={busy}
              busy={busy && confirmingDelete}
            >
              {confirmingDelete ? "정말 지우기" : "데이터 지우기"}
            </Button>
            {confirmingDelete ? (
              <Button
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                취소
              </Button>
            ) : null}
          </div>
        </>
      }
    >
      {summary ? <Question>{summary}</Question> : null}
      {settings ? (
        <>
          <Toggle
            label="알림 전체 멈춤"
            hint="켜 두면 아무것도 묻지 않아요"
            checked={settings.paused}
            disabled={busy}
            onChange={(paused) => void patch({ paused })}
          />
          {settings.tracks.map((item) => (
            <TrackCard
              key={item.track}
              settings={item}
              busy={busy}
              onPatch={(change) => void patch({ tracks: [{ track: item.track, ...change }] })}
            />
          ))}
        </>
      ) : null}
    </Canvas>
  );
}
