-- SoulBlade: 장비 + 메타 성장 스키마

-- equipment 테이블
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory')),
  grade TEXT NOT NULL CHECK (grade IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  name TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}',
  equipped_by UUID REFERENCES characters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- skill_tree 테이블 (메타 성장)
CREATE TABLE IF NOT EXISTS skill_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  UNIQUE(user_id, node_id)
);

-- game_runs 테이블 (게임 결과 기록)
CREATE TABLE IF NOT EXISTS game_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
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

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_equipped_by ON equipment(equipped_by);
CREATE INDEX IF NOT EXISTS idx_skill_tree_user_id ON skill_tree(user_id);
CREATE INDEX IF NOT EXISTS idx_game_runs_user_id ON game_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_runs_created_at ON game_runs(created_at DESC);

-- RLS 활성화
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_runs ENABLE ROW LEVEL SECURITY;

-- equipment RLS: 본인만 CRUD
CREATE POLICY "equipment_select_own" ON equipment
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "equipment_insert_own" ON equipment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_update_own" ON equipment
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "equipment_delete_own" ON equipment
  FOR DELETE USING (auth.uid() = user_id);

-- skill_tree RLS: 본인만 읽기/수정
CREATE POLICY "skill_tree_select_own" ON skill_tree
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "skill_tree_insert_own" ON skill_tree
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "skill_tree_update_own" ON skill_tree
  FOR UPDATE USING (auth.uid() = user_id);

-- game_runs RLS: 본인 기록만 읽기, INSERT는 service_role만
CREATE POLICY "game_runs_select_own" ON game_runs
  FOR SELECT USING (auth.uid() = user_id);

-- game_runs INSERT는 Edge Function(service_role)에서만 허용
-- 클라이언트 직접 INSERT 차단하여 점수 조작 방지

-- 메타 골드 원자적 증가 RPC
CREATE OR REPLACE FUNCTION increment_meta_gold(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_gold INTEGER;
BEGIN
  UPDATE profiles
  SET meta_gold = meta_gold + p_amount
  WHERE id = p_user_id
  RETURNING meta_gold INTO new_gold;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN new_gold;
END;
$$;

-- 메타 골드 원자적 차감 RPC (잔액 부족 시 실패)
CREATE OR REPLACE FUNCTION deduct_meta_gold(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_gold INTEGER;
BEGIN
  UPDATE profiles
  SET meta_gold = meta_gold - p_amount
  WHERE id = p_user_id AND meta_gold >= p_amount
  RETURNING meta_gold INTO new_gold;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient meta gold';
  END IF;

  RETURN new_gold;
END;
$$;
