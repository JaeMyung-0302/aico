-- SoulBlade: 일일 진행 + 출석 스키마

-- daily_progress 테이블 (일일 도전 + 출석)
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenges JSONB NOT NULL DEFAULT '[]',
  attendance_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  consecutive_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, date DESC);

-- RLS 활성화
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

-- RLS: 본인만 읽기/쓰기
CREATE POLICY "daily_progress_select_own" ON daily_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_progress_insert_own" ON daily_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_progress_update_own" ON daily_progress
  FOR UPDATE USING (auth.uid() = user_id);
