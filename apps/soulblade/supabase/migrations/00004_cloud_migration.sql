-- SoulBlade: 클라우드 통합 마이그레이션 (sb_ prefix)
-- monster-factory Supabase 프로젝트 재사용을 위한 네임스페이스 분리

-- ==========================================
-- 1. 테이블 생성
-- ==========================================

-- sb_profiles (Auth 연동)
CREATE TABLE IF NOT EXISTS sb_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  meta_gold INTEGER NOT NULL DEFAULT 0,
  gems INTEGER NOT NULL DEFAULT 0,
  attendance_streak INTEGER NOT NULL DEFAULT 0,
  last_attendance_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sb_characters
CREATE TABLE IF NOT EXISTS sb_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sb_profiles(id) ON DELETE CASCADE,
  class_type TEXT NOT NULL CHECK (class_type IN ('Warrior', 'Archer', 'Mage', 'Paladin')),
  mastery_level INTEGER NOT NULL DEFAULT 0,
  mastery_exp INTEGER NOT NULL DEFAULT 0,
  permanent_hp INTEGER NOT NULL DEFAULT 0,
  permanent_atk INTEGER NOT NULL DEFAULT 0,
  permanent_def INTEGER NOT NULL DEFAULT 0,
  permanent_spd INTEGER NOT NULL DEFAULT 0,
  permanent_crit INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, class_type)
);

-- sb_equipment
CREATE TABLE IF NOT EXISTS sb_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sb_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory')),
  grade TEXT NOT NULL CHECK (grade IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  name TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}',
  equipped_by UUID REFERENCES sb_characters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sb_skill_tree (메타 성장)
CREATE TABLE IF NOT EXISTS sb_skill_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sb_profiles(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  UNIQUE(user_id, node_id)
);

-- sb_game_runs (게임 결과 기록)
CREATE TABLE IF NOT EXISTS sb_game_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sb_profiles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES sb_characters(id) ON DELETE CASCADE,
  class_type TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  survived_seconds INTEGER NOT NULL DEFAULT 0,
  monsters_killed INTEGER NOT NULL DEFAULT 0,
  boss_killed BOOLEAN NOT NULL DEFAULT FALSE,
  max_level INTEGER NOT NULL DEFAULT 1,
  meta_gold_earned INTEGER NOT NULL DEFAULT 0,
  skills_acquired TEXT[] NOT NULL DEFAULT '{}',
  equipment_dropped UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sb_daily_progress (일일 도전 + 출석)
CREATE TABLE IF NOT EXISTS sb_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sb_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenges JSONB NOT NULL DEFAULT '[]',
  attendance_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  consecutive_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- sb_rpg_saves (게임 세이브)
CREATE TABLE IF NOT EXISTS sb_rpg_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sb_profiles(id) ON DELETE CASCADE,
  save_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==========================================
-- 2. 인덱스
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_sb_equipment_user_id ON sb_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_sb_equipment_equipped_by ON sb_equipment(equipped_by);
CREATE INDEX IF NOT EXISTS idx_sb_skill_tree_user_id ON sb_skill_tree(user_id);
CREATE INDEX IF NOT EXISTS idx_sb_game_runs_user_id ON sb_game_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_sb_game_runs_created_at ON sb_game_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sb_daily_progress_user_date ON sb_daily_progress(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sb_rpg_saves_user_id ON sb_rpg_saves(user_id);

-- ==========================================
-- 3. RLS 활성화
-- ==========================================

ALTER TABLE sb_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_skill_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_game_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_rpg_saves ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. RLS 정책
-- ==========================================

-- sb_profiles: INSERT 없음 (트리거로만 생성)
CREATE POLICY "sb_profiles_select_own" ON sb_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "sb_profiles_update_own" ON sb_profiles
  FOR UPDATE USING (auth.uid() = id);

-- sb_characters: 본인만 CRUD
CREATE POLICY "sb_characters_select_own" ON sb_characters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sb_characters_insert_own" ON sb_characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sb_characters_update_own" ON sb_characters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sb_characters_delete_own" ON sb_characters
  FOR DELETE USING (auth.uid() = user_id);

-- sb_equipment: 본인만 CRUD
CREATE POLICY "sb_equipment_select_own" ON sb_equipment
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sb_equipment_insert_own" ON sb_equipment
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sb_equipment_update_own" ON sb_equipment
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sb_equipment_delete_own" ON sb_equipment
  FOR DELETE USING (auth.uid() = user_id);

-- sb_skill_tree: 본인만 읽기/수정
CREATE POLICY "sb_skill_tree_select_own" ON sb_skill_tree
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sb_skill_tree_insert_own" ON sb_skill_tree
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sb_skill_tree_update_own" ON sb_skill_tree
  FOR UPDATE USING (auth.uid() = user_id);

-- sb_game_runs: 본인 읽기만 (INSERT는 service_role/Edge Function)
CREATE POLICY "sb_game_runs_select_own" ON sb_game_runs
  FOR SELECT USING (auth.uid() = user_id);

-- sb_daily_progress: 본인만 읽기/쓰기
CREATE POLICY "sb_daily_progress_select_own" ON sb_daily_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sb_daily_progress_insert_own" ON sb_daily_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sb_daily_progress_update_own" ON sb_daily_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- sb_rpg_saves: 본인만 읽기/쓰기
CREATE POLICY "sb_rpg_saves_select_own" ON sb_rpg_saves
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sb_rpg_saves_insert_own" ON sb_rpg_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sb_rpg_saves_update_own" ON sb_rpg_saves
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 5. 트리거 함수
-- ==========================================

-- Auth 신규 가입 시 sb_profiles 자동 생성
CREATE OR REPLACE FUNCTION sb_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sb_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Adventurer'));
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER sb_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sb_handle_new_user();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION sb_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sb_profiles_updated_at
  BEFORE UPDATE ON sb_profiles
  FOR EACH ROW EXECUTE FUNCTION sb_update_updated_at();

CREATE TRIGGER sb_characters_updated_at
  BEFORE UPDATE ON sb_characters
  FOR EACH ROW EXECUTE FUNCTION sb_update_updated_at();

CREATE TRIGGER sb_rpg_saves_updated_at
  BEFORE UPDATE ON sb_rpg_saves
  FOR EACH ROW EXECUTE FUNCTION sb_update_updated_at();

-- ==========================================
-- 6. RPC 함수
-- ==========================================

-- 메타 골드 원자적 증가
CREATE OR REPLACE FUNCTION sb_increment_meta_gold(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_gold INTEGER;
BEGIN
  UPDATE sb_profiles
  SET meta_gold = meta_gold + p_amount
  WHERE id = p_user_id
  RETURNING meta_gold INTO new_gold;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN new_gold;
END;
$$;

-- 클라이언트 직접 호출 차단 (service_role만 호출 가능)
REVOKE EXECUTE ON FUNCTION sb_increment_meta_gold(UUID, INTEGER) FROM anon, authenticated;

-- 메타 골드 원자적 차감 (잔액 부족 시 실패)
CREATE OR REPLACE FUNCTION sb_deduct_meta_gold(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_gold INTEGER;
BEGIN
  UPDATE sb_profiles
  SET meta_gold = meta_gold - p_amount
  WHERE id = p_user_id AND meta_gold >= p_amount
  RETURNING meta_gold INTO new_gold;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient meta gold';
  END IF;

  RETURN new_gold;
END;
$$;

-- 클라이언트 직접 호출 차단 (service_role만 호출 가능)
REVOKE EXECUTE ON FUNCTION sb_deduct_meta_gold(UUID, INTEGER) FROM anon, authenticated;
