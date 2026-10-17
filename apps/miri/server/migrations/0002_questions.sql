-- Miri v2. 질문을 데이터로 뺀다.
-- 알림 시각은 4개 슬롯(07:30/12:30/18:30/21:00) 중 하나만 허용하되 검증은 코드에서 한다.

ALTER TABLE users ADD COLUMN paused INTEGER NOT NULL DEFAULT 0;

-- logs: 부위를 단일 → 복수(JSON 배열)로. SQLite 는 CHECK 를 못 고치므로 테이블을 다시 만든다.
CREATE TABLE logs_v2 (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  logged_on  TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('gym', 'cardio', 'light', 'rest')),
  -- 헬스일 때만. '["chest","legs"]' 형태의 JSON 배열.
  parts      TEXT,
  intensity  TEXT CHECK (intensity IS NULL OR intensity IN ('easy', 'normal', 'hard')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, logged_on)
);
INSERT INTO logs_v2 (id, user_id, logged_on, kind, parts, intensity, created_at)
  SELECT id, user_id, logged_on, kind,
         CASE WHEN part IS NULL THEN NULL ELSE json_array(part) END,
         intensity, created_at
  FROM logs;
DROP TABLE logs;
ALTER TABLE logs_v2 RENAME TO logs;

-- events: 재알림과 주간 요약 발송을 퍼널에 추가한다.
CREATE TABLE events_v2 (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'push_sent', 'push_failed', 'opened', 'completed', 'remind_sent', 'summary_sent')),
  occurred_on TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO events_v2 (id, user_id, type, occurred_on, created_at)
  SELECT id, user_id, type, occurred_on, created_at FROM events;
DROP TABLE events;
ALTER TABLE events_v2 RENAME TO events;
CREATE INDEX idx_events_user_day ON events (user_id, occurred_on, type);

-- 미리가 던진 질문. 하루에 daily 하나, 일요일에 weekly 하나.
-- 답(logs)은 여기 answered_at 으로 이어지고, 재알림과 침묵 규칙도 이 표만 본다.
CREATE TABLE questions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  intent       TEXT NOT NULL CHECK (intent IN ('daily', 'weekly')),
  text         TEXT NOT NULL,
  -- daily 에서 예측이 있을 때만. '{"kind":"gym","parts":["chest"],"intensity":"normal"}'
  prediction   TEXT,
  asked_on     TEXT NOT NULL,
  -- UTC ISO. 재알림(90분) 계산용이라 KST 로 바꾸지 않는다.
  asked_at     TEXT NOT NULL,
  reminded     INTEGER NOT NULL DEFAULT 0,
  answered_at  TEXT,
  answered_via TEXT CHECK (answered_via IS NULL OR answered_via IN ('predict', 'pick', 'action')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, asked_on, intent)
);

CREATE INDEX idx_questions_open ON questions (asked_on, intent, answered_at, reminded);
