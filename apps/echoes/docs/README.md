# Echoes of Maple — 기획·설계 문서

IDEAX → kickoff(2026-05-29)로 생성. 원본은 `.claude/outputs/`.

| 문서 | 상태 | 경로 |
|------|------|------|
| Game Design Brief | ✅ 유효 (엔진 무관 — 컨셉/문제/범위) | [`.claude/outputs/echoes-of-maple-game-design-brief.md`](../../../.claude/outputs/echoes-of-maple-game-design-brief.md) |
| Architecture Decision | ⚠️ **폐기** (MSW DataStorage 기반 — 엔진 Unity로 전환됨) | [`.claude/outputs/echoes-of-maple-architecture-decision.md`](../../../.claude/outputs/echoes-of-maple-architecture-decision.md) |
| Implementation Plan | 🟡 일부 유효 (Phase 구성/로드맵은 참고, MSW 특정 단계는 무시) | [`.claude/outputs/echoes-of-maple-implementation-plan.md`](../../../.claude/outputs/echoes-of-maple-implementation-plan.md) |

## 엔진 결정 경위
MSW Lua(참고용 플랫폼) → Phaser/웹 → **Unity 6 LTS (2D, C#)** 최종.
이유: 사용자가 Phaser의 게임디자인/UI 한계를 직접 경험 → "제한 없이" 위해 Unity.

## 컨셉 요약 (엔진 무관, 유효)
- 죽으면 흔적(잔흔)이 다른 플레이어 던전에 시드되는 **async-social 로그라이크**
- **우선순위:** 싱글플레이 코어(절차 던전+전투+죽음/재시작) 먼저 → async-social은 이후 백엔드와
- 차별 인자: 죽음이 콘텐츠가 되는 데이터 플라이휠
