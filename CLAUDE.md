# AICO Monorepo

## Port Assignments

각 앱의 포트 할당 현황. 포트 충돌 방지를 위해 반드시 확인 후 사용할 것.

| App        | Frontend | Backend | DB (Docker) |
| ---------- | -------- | ------- | ----------- |
| CookSnap   | 5177     | 4000    | 5436        |
| WASD       | 5174     | 4002    | -           |
| SoulBlade  | 5175     | 4003    | 5434        |
| FridgeMate | 5176     | 4001    | 5435        |
| ContentBot | -        | -       | -           |

### 규칙

- **3000, 3001 포트 사용 금지** (Next.js apps/web, apps/docs 예약)
- Frontend: 5173부터 순차 할당
- Backend: 4000부터 순차 할당
- DB (Docker): 5434부터 순차 할당 (5433은 외부 프로젝트와 충돌하여 skip)
- 새 앱 추가 시 다음 번호 사용 (Frontend: 5178, Backend: 4004, DB: 5437)
