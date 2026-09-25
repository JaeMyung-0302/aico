import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  deleteMe,
  fetchToday,
  UnknownUserError,
  updateMe,
  type Settings as SettingsData,
} from "../api.ts";
import Button from "../components/Button.tsx";
import Canvas from "../components/Canvas.tsx";
import { LoggerHeader } from "../components/Header.tsx";
import { ErrorNote, Question } from "../components/Prompt.tsx";
import SlotPicker from "../components/SlotPicker.tsx";
import type { NotifySlot } from "../domain.ts";
import { describeSlot } from "./options.ts";
import styles from "./Settings.module.scss";

/** 설정은 셋뿐이다. 알림 시간대, 잠시 멈춤, 데이터 지우기. */
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
    fetchToday(userId)
      .then((today) => {
        if (!cancelled) setSettings(today.settings);
      })
      .catch((cause: unknown) => {
        if (!cancelled) fail(cause, "설정을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, fail]);

  const patch = async (change: { notifyAt?: NotifySlot; paused?: boolean }) => {
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

  const summary = settings
    ? settings.paused
      ? "알림이 멈춰 있어요"
      : `매일 ${describeSlot(settings.notifyAt)}에 물어봐요`
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
          <section className={styles.section}>
            <h3 className={styles.caption}>알림 시간</h3>
            <SlotPicker
              value={settings.notifyAt}
              onChange={(slot) => void patch({ notifyAt: slot })}
              disabled={busy}
            />
          </section>
          <section className={styles.section}>
            <h3 className={styles.caption}>알림</h3>
            <Button
              variant="ghost"
              onClick={() => void patch({ paused: !settings.paused })}
              disabled={busy}
              aria-pressed={settings.paused}
            >
              {settings.paused ? "다시 물어봐 주세요" : "잠시 멈추기"}
            </Button>
          </section>
        </>
      ) : null}
    </Canvas>
  );
}
