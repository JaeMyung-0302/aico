-- SoulBlade RPC 함수 (로컬 Docker DB용)
-- prisma db push 후 실행: npx prisma db execute --file prisma/init.sql

-- 메타 골드 원자적 증가
CREATE OR REPLACE FUNCTION sb_increment_meta_gold(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  new_gold INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

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

-- 메타 골드 원자적 차감 (잔액 부족 시 실패)
CREATE OR REPLACE FUNCTION sb_deduct_meta_gold(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  new_gold INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

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
