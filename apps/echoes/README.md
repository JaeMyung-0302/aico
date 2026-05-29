# Echoes of Maple (잔흔)

> MapleStory Worlds 스타일을 **참고**한 독립 2D 게임 프로젝트 (Unity).
> **비동기 소셜 로그라이크** — "죽으면 흔적이 남아 다른 모험가의 던전에 등장한다." (async-social은 후속, 우선 싱글플레이 코어)

---

## 스택 / 성격

- **엔진:** Unity 6 LTS (2D), **언어:** C#
- AICO `apps/`에 위치하지만 **pnpm/turbo 워크스페이스 비통합** (`package.json` 없음 → 빌드 파이프라인 무관)
- Unity 생성 대용량/기계파일은 `.gitignore` 처리 (Library/, Temp/, *.csproj 등). `*.meta`는 커밋 대상.

> ⚠️ **현재 C# 스크립트는 Unity에서 컴파일/실행 검증 전 초안입니다.** (이 저장소 환경엔 Unity·dotnet이 없어 작성자가 실행 못 함.) Unity 에디터에서 본인이 검증·조정해야 합니다.

---

## 0. Unity 설치 (아직 미설치)

1. **Unity Hub** 다운로드 → 설치: https://unity.com/download
2. Hub에서 **Unity 6 LTS** 에디터 설치 (Apple Silicon이면 Silicon 빌드 선택)
   - 모듈: 기본값 + 필요 시 빌드 타겟(WebGL/macOS) 추가
3. 라이선스: **Personal (무료)** 활성화 — 연 수입 $200K 미만이면 해당
4. **2D 템플릿**으로 새 프로젝트 생성:
   - 프로젝트 이름: `echoes-of-maple`
   - 위치: `/Users/ijaemyeong/Desktop/aico/apps` 선택 → 결과 경로가 `apps/echoes-of-maple`이 되도록

> 📌 **폴더 충돌 주의:** 이 폴더엔 이미 `Assets/Scripts/`(C# 초안)·`.gitignore`·`docs/`가 있습니다.
> - Unity Hub가 **비어있지 않은 폴더**라 거부하면 → 임시 위치에 프로젝트를 만든 뒤, 이 폴더의 `Assets/Scripts/` 내용을 생성된 프로젝트의 `Assets/`로 복사하세요.
> - 거부하지 않으면 → 그대로 생성하면 Unity가 기존 `Assets/Scripts/*.cs`를 임포트하고 `*.meta`를 생성합니다.

---

## 1. 폴더 구조

```
apps/echoes-of-maple/
├── README.md
├── .gitignore                      # Unity용
├── docs/                           # 기획·설계 (kickoff 산출물 링크)
└── Assets/
    └── Scripts/
        ├── Core/                   # 순수 로직 (UnityEngine 비의존, 테스트 가능)
        │   ├── GameTypes.cs        # RoomType, RoomData, FloorLayout 등
        │   └── DungeonGenerator.cs # 절차적 던전 생성 (시드 고정 시 결정적)
        └── Gameplay/               # MonoBehaviour (씬에 부착)
            └── RunManager.cs       # 런 상태머신 (Idle→InRun→Dead→Meta)
```

> Unity가 프로젝트 생성 시 `ProjectSettings/`, `Packages/`, `Assets/*.meta` 등을 자동 생성합니다 (직접 만들지 마세요).

---

## 2. 스크립트 연결 (Unity 에디터에서)

1. Unity가 `Assets/Scripts`를 임포트했는지 확인 (콘솔에 컴파일 에러 없어야 함)
2. 빈 씬에 빈 **GameObject** 생성 → 이름 `RunManager`
3. `RunManager.cs` 컴포넌트 부착
4. 임시 테스트: 다른 스크립트나 인스펙터 버튼에서 `StartRun()` 호출 → **Console에 "Floor 1 (5 rooms): Combat ..." 로그**가 찍히면 던전 생성 로직 OK
   - (`*`는 elite 방 = 후속 잔흔 시드 후보 표시)

> 이 로그 검증이 **첫 GO 신호**입니다. 생성 로직이 도는 걸 본인 눈으로 확인하는 단계.

---

## 3. 다음 단계 (Phase 1 코어 루프)

- [ ] 0. Unity 설치 + 2D 프로젝트 생성 (위 가이드)
- [ ] 1. `RunManager.StartRun()` → Console 던전 로그 확인 ← **현재 도달 목표**
- [ ] 2. 플레이어 컨트롤러 (이동/점프) — 메이플식 플랫포머 조작
- [ ] 3. 전투 (`CombatSystem`) + 몬스터 프리팹
- [ ] 4. 방→방 전이 + 죽음→메타→재시작 루프 완성
- [ ] 5. "5분 한 판" 재미 검증 (본인 플레이)

> async-social(잔흔 WRITE/READ/REWARD)은 싱글플레이 코어가 재밌다고 확인된 **이후** 백엔드와 함께 추가.

---

## 진행 방식

- **제가(AI):** C# 로직·시스템·아키텍처 작성, 디버깅 자문, 던전/전투/성장 설계
- **본인:** Unity 에디터 운전(씬·프리팹·인스펙터·플레이모드), 컴파일/실행 검증, 피드백
- 막히면 에러 메시지·Console 로그를 그대로 주세요 → 수정해 드립니다.
