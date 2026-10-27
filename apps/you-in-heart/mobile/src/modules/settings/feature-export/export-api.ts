import { type ExportJob, exportJobSchema, latestExportResponseSchema } from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// POST /export (연결 해제 유예 중에도 허용) — 진행 중인 작업이 있으면 그 작업을 돌려준다. 409 PURGE_IMMINENT
export const requestExport = (): Promise<ExportJob> =>
  requestApi({ method: 'POST', url: '/export', schema: exportJobSchema })

// GET /export — 가장 최근 작업(앱을 다시 열어도 진행 상태를 이어 보여준다). READY 면 24시간 서명 URL 포함
export const fetchLatestExport = async (): Promise<ExportJob | null> => {
  const { job } = await requestApi({ method: 'GET', url: '/export', schema: latestExportResponseSchema })
  return job
}
