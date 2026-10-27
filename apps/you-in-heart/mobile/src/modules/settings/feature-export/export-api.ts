import { type ExportJob, exportJobSchema, latestExportResponseSchema } from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// POST /export (연결 해제 유예 중에도 허용) — 진행 중인 작업이 있으면 그 작업을 돌려준다. 409 PURGE_IMMINENT
export const requestExport = (): Promise<ExportJob> =>
  requestApi({ method: 'POST', url: '/export', schema: exportJobSchema })

// GET /export — 가장 최근 작업(앱을 다시 열어도 진행 상태를 이어 보여준다). READY 면 서명 URL 포함(10분 — 파일은 expiresAt 까지)
export const fetchLatestExport = async (): Promise<ExportJob | null> => {
  const { job } = await requestApi({ method: 'GET', url: '/export', schema: latestExportResponseSchema })
  return job
}

// GET /export/:jobId — 내려받기 직전에 새 서명 URL 을 받는다(목록에서 받은 링크는 10분이면 만료된다)
export const fetchExportJob = (jobId: string): Promise<ExportJob> =>
  requestApi({ method: 'GET', url: `/export/${encodeURIComponent(jobId)}`, schema: exportJobSchema })
