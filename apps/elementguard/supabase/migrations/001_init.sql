-- ElementGuard: 초기 스키마
-- profiles: 유저 프로필
-- growth_tree: 영구 성장 트리 상태
-- game_runs: 게임 기록
-- archive: 도감 (발견한 유닛/유물)
-- leaderboard: 리더보드

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  gel INTEGER NOT NULL DEFAULT 0,
  exp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_games INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  is_guest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Growth Tree
CREATE TABLE IF NOT EXISTS growth_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attack_level INTEGER NOT NULL DEFAULT 0 CHECK (attack_level BETWEEN 0 AND 3),
  defense_level INTEGER NOT NULL DEFAULT 0 CHECK (defense_level BETWEEN 0 AND 3),
  economy_level INTEGER NOT NULL DEFAULT 0 CHECK (economy_level BETWEEN 0 AND 3),
  luck_level INTEGER NOT NULL DEFAULT 0 CHECK (luck_level BETWEEN 0 AND 3),
  total_invested INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Game Runs
CREATE TABLE IF NOT EXISTS game_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wave INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  is_clear BOOLEAN NOT NULL DEFAULT false,
  artifacts TEXT[] NOT NULL DEFAULT '{}',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_runs_user ON game_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_runs_score ON game_runs(score DESC);

-- 4. Archive (도감)
CREATE TABLE IF NOT EXISTS archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('unit', 'fusion', 'artifact')),
  item_id TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_archive_user ON archive(user_id);

-- 5. Leaderboard (주간, 유저당 주간 최고 1건)
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 999999),
  wave INTEGER NOT NULL CHECK (wave BETWEEN 0 AND 30),
  week_start DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_week_score ON leaderboard(week_start, score DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER growth_tree_updated_at
  BEFORE UPDATE ON growth_tree
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 리더보드 display_name 스푸핑 방지: profiles에서 강제 동기화
CREATE OR REPLACE FUNCTION sync_leaderboard_display_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.display_name := (SELECT display_name FROM profiles WHERE id = NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER leaderboard_sync_name
  BEFORE INSERT OR UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION sync_leaderboard_display_name();

-- 프로필 통계 원자적 갱신 (N+1 방지)
CREATE OR REPLACE FUNCTION increment_profile_stats(p_user_id UUID, p_score INTEGER)
RETURNS VOID AS $$
  UPDATE profiles SET
    total_games = total_games + 1,
    best_score = GREATEST(best_score, p_score)
  WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;
