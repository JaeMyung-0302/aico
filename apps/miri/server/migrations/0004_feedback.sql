-- Miri v4. 기록 직후 돌려준 피드백을 남긴다.
-- 오늘 화면을 다시 열어도 같은 말이 보이도록 기록 행에 붙인다. 할 말이 없던 날은 NULL.

ALTER TABLE logs ADD COLUMN feedback TEXT;
