# AICO Monorepo

## Port Assignments

각 앱의 포트 할당 현황. 포트 충돌 방지를 위해 반드시 확인 후 사용할 것.

| App        | Frontend | Backend | DB (Docker) |
| ---------- | -------- | ------- | ----------- |
| WASD       | 5174     | 4002    | -           |
| 금수강산   | 5175     | 4003    | 5434        |
| FridgeMate | 5176     | 4001    | 5435        |
| CookSnap   | 5177     | 4000    | 5436        |
| Portfolio  | 5178     | -       | -           |
| AlphaDeck  | 5179     | 4004    | 5437        |
| Onboard    | 5180     | 4005    | 5438        |
| neurex-viz | 5181     | 4006    | -           |

### 규칙

- **3000, 3001 포트 사용 금지** (Next.js apps/web, apps/docs 예약)
- Frontend: 5173부터 순차 할당
- Backend: 4000부터 순차 할당
- DB (Docker): 5434부터 순차 할당 (5433은 외부 프로젝트와 충돌하여 skip)
- 새 앱 추가 시 다음 번호 사용 (Frontend: 5182, Backend: 4007, DB: 5439)
