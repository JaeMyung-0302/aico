-- Miri v1 스키마.
-- 모든 시각 문자열은 KST 기준으로 저장한다. Worker 는 UTC 로 돌기 때문에
-- 읽고 쓰는 쪽에서 kst() 를 거치는 것을 규칙으로 삼는다.

CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  -- v1 은 기본값만 쓰지만 발송 로직은 처음부터 이 컬럼을 기준으로 돈다.
  -- 사용자별 시간을 열 때 발송 구조를 다시 짜지 않기 위해서다.
  notify_at    TEXT NOT NULL DEFAULT '21:00',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_notify_at ON users (notify_at);

CREATE TABLE logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  logged_on  TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('gym', 'cardio', 'light', 'rest')),
  part       TEXT CHECK (part IS NULL OR part IN ('chest', 'back', 'legs', 'shoulders_arms')),
  intensity  TEXT CHECK (intensity IS NULL OR intensity IN ('easy', 'normal', 'hard')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, logged_on)
);

-- 응답률을 재는 것이 v1 의 유일한 목적이라 퍼널을 따로 남긴다.
-- logs 만으로는 "알림을 못 봤다" 와 "보고 무시했다" 를 구분할 수 없다.
CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('push_sent', 'push_failed', 'opened', 'completed')),
  occurred_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_user_day ON events (user_id, occurred_on, type);
