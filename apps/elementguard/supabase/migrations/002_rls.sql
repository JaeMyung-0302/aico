-- ElementGuard: Row Level Security 정책

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Growth Tree
ALTER TABLE growth_tree ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own growth"
  ON growth_tree FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own growth"
  ON growth_tree FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own growth"
  ON growth_tree FOR UPDATE
  USING (auth.uid() = user_id);

-- Game Runs
ALTER TABLE game_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own runs"
  ON game_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs"
  ON game_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Archive
ALTER TABLE archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own archive"
  ON archive FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own archive"
  ON archive FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Leaderboard (공개 읽기, 본인만 쓰기)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own leaderboard"
  ON leaderboard FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND score BETWEEN 0 AND 999999
    AND wave BETWEEN 0 AND 30
  );

-- game_runs: INSERT 전용 (불변 기록, UPDATE/DELETE 정책 의도적 미설정)
-- archive: INSERT 전용 (도감 발견 기록, UPDATE/DELETE 정책 의도적 미설정)
