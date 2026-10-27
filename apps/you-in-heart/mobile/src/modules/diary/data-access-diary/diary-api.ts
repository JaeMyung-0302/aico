import {
  type CreateAutoDaysResponse,
  createAutoDaysResponseSchema,
  type CreateDiaryRequest,
  type DiaryEntry,
  diaryEntrySchema,
  type DiaryListResponse,
  diaryListResponseSchema,
  type UpdateDiaryRequest,
} from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

type DiaryPageQuery = { cursor?: string; before?: string }

// GET /diary — happenedOn desc, id desc. before 는 그날을 빼고(YYYY-MM-DD) 그 전부터
export const fetchDiaryPage = ({ cursor, before }: DiaryPageQuery): Promise<DiaryListResponse> =>
  requestApi({
    method: 'GET',
    url: '/diary',
    params: { ...(cursor ? { cursor } : {}), ...(before ? { before } : {}) },
    schema: diaryListResponseSchema,
  })

// 서버가 memory_created 를 기록한다 → 앱은 이벤트를 따로 보내지 않는다
export const createDiary = (body: CreateDiaryRequest): Promise<DiaryEntry> =>
  requestApi({ method: 'POST', url: '/diary', data: body, schema: diaryEntrySchema })

// 과거 사진 일괄 등록: 날짜별 "그날의 사진"(AUTO_DAY) 엔트리를 멱등으로 만든다(요청당 366일까지)
export const createAutoDays = (dates: readonly string[]): Promise<CreateAutoDaysResponse> =>
  requestApi({ method: 'POST', url: '/diary/auto-days', data: { dates }, schema: createAutoDaysResponseSchema })

export const fetchDiaryEntry = (id: string): Promise<DiaryEntry> =>
  requestApi({ method: 'GET', url: `/diary/${encodeURIComponent(id)}`, schema: diaryEntrySchema })

// 작성자만 (아니면 403 NOT_AUTHOR)
export const updateDiary = (id: string, body: UpdateDiaryRequest): Promise<DiaryEntry> =>
  requestApi({ method: 'PATCH', url: `/diary/${encodeURIComponent(id)}`, data: body, schema: diaryEntrySchema })

// 작성자만. 사진 원본까지 서버가 지운다
export const deleteDiary = (id: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `/diary/${encodeURIComponent(id)}` })

// 상세 화면을 열 때 1건 (본문·좌표는 싣지 않는다)
export const trackMemoryViewed = (): Promise<void> =>
  requestApi({ method: 'POST', url: '/events', data: { name: 'memory_viewed', props: {} } })
