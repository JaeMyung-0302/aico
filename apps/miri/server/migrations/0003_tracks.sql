-- Miri v3. 운동 하나였던 기록을 트랙(분야) 단위로 일반화한다.
-- 알림 시각, 재알림, 쉬는 요일은 트랙마다 다르므로 users 에서 user_tracks 로 옮긴다.

CREATE TABLE user_tracks (
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  track      TEXT NOT NULL,
  -- HH:MM, 10분 단위. 프리셋 4개 외에 직접 고른 값도 온다.
  notify_at  TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  remind     INTEGER NOT NULL DEFAULT 1,
  -- 알림을 쉬는 요일. '0,6' 처럼 쉼표 목록, 0=일요일. 비면 매일.
  off_days   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, track)
);
CREATE INDEX idx_user_tracks_due ON user_tracks (notify_at, enabled);

INSERT INTO user_tracks (user_id, track, notify_at)
  SELECT id, 'exercise', notify_at FROM users;

DROP INDEX idx_users_notify_at;
ALTER TABLE users DROP COLUMN notify_at;

-- logs: 트랙별 답을 JSON 한 칸에. 검증은 트랙 정의로 코드에서 한다.
CREATE TABLE logs_v3 (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  track      TEXT NOT NULL,
  logged_on  TEXT NOT NULL,
  answer     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, track, logged_on)
);
INSERT INTO logs_v3 (id, user_id, track, logged_on, answer, created_at)
  SELECT id, user_id, 'exercise', logged_on,
         json_object(
           'kind', kind,
           'parts', CASE WHEN parts IS NULL THEN json('[]') ELSE json(parts) END,
           'intensity', CASE intensity WHEN 'easy' THEN 'low' WHEN 'normal' THEN 'mid' WHEN 'hard' THEN 'high' END
         ),
         created_at
  FROM logs;
DROP TABLE logs;
ALTER TABLE logs_v3 RENAME TO logs;

-- questions: 트랙 열 추가. 주간 요약은 트랙 전체를 묶어 track='all' 로 한 건.
CREATE TABLE questions_v3 (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  track        TEXT NOT NULL,
  intent       TEXT NOT NULL CHECK (intent IN ('daily', 'weekly')),
  text         TEXT NOT NULL,
  prediction   TEXT,
  asked_on     TEXT NOT NULL,
  asked_at     TEXT NOT NULL,
  reminded     INTEGER NOT NULL DEFAULT 0,
  answered_at  TEXT,
  answered_via TEXT CHECK (answered_via IS NULL OR answered_via IN ('predict', 'pick', 'action')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, track, asked_on, intent)
);
INSERT INTO questions_v3 (id, user_id, track, intent, text, prediction, asked_on, asked_at, reminded, answered_at, answered_via, created_at)
  SELECT id, user_id, CASE intent WHEN 'weekly' THEN 'all' ELSE 'exercise' END, intent, text,
         CASE WHEN prediction IS NULL THEN NULL ELSE
           json_object(
             'kind', json_extract(prediction, '$.kind'),
             'parts', CASE WHEN json_extract(prediction, '$.parts') IS NULL THEN json('[]') ELSE json(json_extract(prediction, '$.parts')) END,
             'intensity', CASE json_extract(prediction, '$.intensity') WHEN 'easy' THEN 'low' WHEN 'normal' THEN 'mid' WHEN 'hard' THEN 'high' END
           ) END,
         asked_on, asked_at, reminded, answered_at, answered_via, created_at
  FROM questions;
DROP TABLE questions;
ALTER TABLE questions_v3 RENAME TO questions;
CREATE INDEX idx_questions_open ON questions (asked_on, intent, answered_at, reminded);
