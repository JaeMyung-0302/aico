-- SoulBlade: 초기 스키마 (profiles + characters)

-- profiles 테이블 (Auth 연동)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  meta_gold INTEGER NOT NULL DEFAULT 0,
  gems INTEGER NOT NULL DEFAULT 0,
  attendance_streak INTEGER NOT NULL DEFAULT 0,
  last_attendance_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- characters 테이블
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- profiles RLS: 본인만 읽기/수정
-- NOTE: INSERT 정책 없음 (의도적) — profiles는 handle_new_user() 트리거(SECURITY DEFINER)로만 생성됨.
-- 클라이언트 직접 INSERT 차단.
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- characters RLS: 본인만 CRUD
CREATE POLICY "characters_select_own" ON characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "characters_insert_own" ON characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "characters_update_own" ON characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "characters_delete_own" ON characters
  FOR DELETE USING (auth.uid() = user_id);

-- Auth 신규 가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Adventurer'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
