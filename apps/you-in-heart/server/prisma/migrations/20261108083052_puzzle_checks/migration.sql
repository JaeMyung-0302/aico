-- Prisma 스키마로 표현하지 못하는 퍼즐 제약: 조각 수는 양수, 끝나는 날 = 시작일 + 조각 수 - 1(하루 한 조각)
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_pieceCount_chk" CHECK ("pieceCount" > 0);
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_endsOn_chk" CHECK ("endsOn" = "startsOn" + ("pieceCount" - 1));
