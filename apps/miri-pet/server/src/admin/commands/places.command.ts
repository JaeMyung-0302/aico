import { type AdminCommand, type AdminServices, stripControlChars } from './admin-command'

// places:* 명령은 places 서비스와 print만 쓴다 (AdminServices를 받는 AdminCommand에 그대로 대입된다)
export type PlacesCommandServices = Pick<AdminServices, 'places' | 'print'>
type PlacesCommand = Omit<AdminCommand, 'run'> & {
  run: (args: readonly string[], services: PlacesCommandServices) => Promise<number>
}

const DEFAULT_LIST_LIMIT = 50

const parseLimit = (raw: string | undefined): number => {
  const limit = Number(raw ?? DEFAULT_LIST_LIMIT)
  return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_LIST_LIMIT
}

const ALLOW_DEV_SAMPLES_FLAG = '--allow-dev-samples'

const placesImportCommand: PlacesCommand = {
  name: 'places:import',
  usage: `places:import <file.json> [${ALLOW_DEV_SAMPLES_FLAG}]  정규화 JSON을 (source, sourceRef) 기준으로 upsert(재실행해도 멱등). 개발용 샘플은 플래그 + 비운영 환경에서만`,
  run: async (args, { places, print }) => {
    const file = args.find((arg) => arg !== ALLOW_DEV_SAMPLES_FLAG)
    if (!file) {
      print(`사용법: places:import <file.json> [${ALLOW_DEV_SAMPLES_FLAG}]`)
      return 1
    }
    const allowDevSamples = args.includes(ALLOW_DEV_SAMPLES_FLAG)
    const { upserted, skipped } = await places.importFromFile(file, { allowDevSamples })
    print(
      `반영 ${upserted}건 · 좌표 없음 건너뜀 ${skipped.missingCoordinates}건 · 형식 오류 건너뜀 ${skipped.invalid}건`,
    )
    return 0
  },
}

const placesReportsCommand: PlacesCommand = {
  name: 'places:reports',
  usage: 'places:reports [limit=50]  대기 중인 장소 제보(오래된 순) + 첨부 사진 presigned URL(60초)',
  run: async ([limit], { places, print }) => {
    const rows = await places.listPendingReports(parseLimit(limit))
    if (rows.length === 0) print('대기 중인 장소 제보가 없습니다')
    rows.forEach((row) => {
      print(
        [row.id, row.createdAt.toISOString(), row.kind, row.placeId ?? '-', row.reporterId ?? '-', row.summary]
          .map(stripControlChars)
          .join('\t'),
      )
      // 안내문 사진: 60초짜리 presigned URL이라 출력 직후 열어 봐야 한다
      row.imageUrls.forEach((url, index) => print(`  사진 ${index + 1}: ${stripControlChars(url)}`))
    })
    return 0
  },
}

const placesApproveCommand: PlacesCommand = {
  name: 'places:approve',
  usage: 'places:approve <reportId>  제보를 장소에 반영 + 최종 확인일 갱신 + 제보자 알림',
  run: async ([reportId], { places, print }) => {
    if (!reportId) {
      print('사용법: places:approve <reportId>')
      return 1
    }
    const { placeId } = await places.approveReport(reportId)
    print(`승인 완료: 제보 ${reportId} → 장소 ${placeId}`)
    return 0
  },
}

const placesRejectCommand: PlacesCommand = {
  name: 'places:reject',
  usage: 'places:reject <reportId>  제보 반려 + 제보자 알림',
  run: async ([reportId], { places, print }) => {
    if (!reportId) {
      print('사용법: places:reject <reportId>')
      return 1
    }
    await places.rejectReport(reportId)
    print(`반려 완료: 제보 ${reportId}`)
    return 0
  },
}

// Phase 3(장소)가 이 파일만 채운다 — index.command.ts는 이 배열을 펼쳐 등록한다
export const placesCommands: readonly PlacesCommand[] = [
  placesImportCommand,
  placesReportsCommand,
  placesApproveCommand,
  placesRejectCommand,
]
