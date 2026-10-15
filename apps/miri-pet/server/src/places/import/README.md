# 장소 import

`pnpm --filter @miri-pet/server admin places:import <file.json>` — 정규화된 JSON 배열을 `(source, sourceRef)` 기준으로 upsert한다(재실행해도 멱등).
좌표가 없거나 (0,0)인 행, 형식이 틀린 행은 건너뛰고 건수를 출력한다. 재import는 운영자가 바꾼 `status`(숨김·폐업)를 덮지 않는다.

행 형식: `source`(PUBLIC_DATA|TOUR_API|KAKAO|USER), `sourceRef`, `name`, `category`, `address`, `lat`, `lng`, `allowedSizes`(S|M|L 배열), `indoorAllowed`, 선택 `conditionsNote`, `verifiedAt`(YYYY-MM-DD).

## ⚠️ dev-sample-places.json — 개발 전용 가짜 데이터

성수·연남 일대 **가상의 장소 15곳**(이름 앞 `[샘플]`, 주소 `(가상 주소 N)`, `sourceRef: dev-sample-*`). 로컬 UI 작업용이며 실제 장소가 아니다.
`--allow-dev-samples` 플래그 없이는 거부되고, `NODE_ENV=production`에서는 플래그가 있어도 거부된다. 실데이터(공공데이터·TourAPI ≥300곳)는 API 키 발급 후 정규화 스크립트를 붙여 같은 명령으로 넣는다.

```bash
pnpm --filter @miri-pet/server build
pnpm --filter @miri-pet/server admin places:import src/places/import/dev-sample-places.json --allow-dev-samples
```
