-- SoulBlade: 캐릭터명 시스템
-- sb_characters 테이블에 name 컬럼 추가 + 전역 UNIQUE 제약

-- 1. name 컬럼 추가 (기존 데이터 호환: nullable)
ALTER TABLE sb_characters
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. 전역 고유 제약 (대소문자 구분 없이 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sb_characters_name_unique
  ON sb_characters (LOWER(name))
  WHERE name IS NOT NULL;

-- 3. 이름 길이 + 공백 제약 (2~8자, trim 강제)
ALTER TABLE sb_characters
  ADD CONSTRAINT chk_sb_characters_name_length
  CHECK (name IS NULL OR (
    char_length(name) >= 2
    AND char_length(name) <= 8
    AND name = TRIM(name)
  ));

-- 4. 이름 중복 검사용 RPC (authenticated만 호출 가능)
CREATE OR REPLACE FUNCTION sb_check_name_available(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.sb_characters
    WHERE LOWER(name) = LOWER(p_name)
  );
END;
$$;

-- authenticated만 호출 허용 (anon 차단)
REVOKE EXECUTE ON FUNCTION sb_check_name_available(TEXT) FROM anon;
