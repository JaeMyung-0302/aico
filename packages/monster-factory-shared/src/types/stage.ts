// 스테이지 적 구성
export interface StageEnemy {
  speciesId: string
  level: number
}

// 스테이지 보상
export interface StageRewards {
  gold: number
  summonStones: number
  equipDropRate: number
}

// 챕터
export interface Chapter {
  id: string
  number: number
  name: string
  description: string | null
  stages: Stage[]
}

// 스테이지
export interface Stage {
  id: string
  chapterId: string
  stageNumber: number
  isBoss: boolean
  energyCost: number
  enemies: StageEnemy[]
  rewards: StageRewards
}

// 스테이지 클리어 결과
export interface StageResult {
  id: string
  userId: string
  stageId: string
  stars: number // 1~3
  clearedAt: string
}

// 스테이지 목록 응답 (클리어 정보 포함)
export interface StageWithResult extends Stage {
  result: StageResult | null
}

// 챕터 목록 응답
export interface ChapterWithProgress extends Omit<Chapter, 'stages'> {
  stages: StageWithResult[]
  clearedCount: number
  totalCount: number
}
