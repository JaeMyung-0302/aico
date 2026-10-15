import type { ReportService } from '../../moderation/report.service'
import type { UserSuspensionService } from '../../moderation/user-suspension.service'
import type { PlaceImportService } from '../../places/import/place-import.service'
import type { PlaceReportReviewService } from '../../places/place-report-review.service'

// 명령이 쓰는 서비스만 좁혀서 받는다 → 단위 테스트에서 가짜로 바꾸기 쉽다
export type AdminServices = {
  reports: Pick<ReportService, 'listPending' | 'resolve'>
  suspension: Pick<UserSuspensionService, 'suspend'>
  places: Pick<PlaceImportService, 'importFromFile'> &
    Pick<PlaceReportReviewService, 'listPendingReports' | 'approveReport' | 'rejectReport'>
  print: (line: string) => void
}

// 유니코드 양방향 제어 문자(표시 순서 뒤집기)
const BIDI_CONTROLS: ReadonlySet<number> = new Set([
  0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
])

// C0(탭·개행·ESC 포함)·DEL·C1 제어 문자 + 양방향 제어 문자
const isControlChar = (codePoint: number): boolean =>
  codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) || BIDI_CONTROLS.has(codePoint)

// 사용자 입력(신고 상세 등)을 터미널에 찍기 전에 제어 문자를 지운다 → ANSI 이스케이프 주입·줄/열 위조 방지
export const stripControlChars = (text: string): string =>
  Array.from(text)
    .filter((char) => !isControlChar(char.codePointAt(0) ?? 0))
    .join('')

export type AdminCommand = {
  name: string
  usage: string
  // 종료 코드(0 성공, 1 실패)를 돌려준다
  run: (args: readonly string[], services: AdminServices) => Promise<number>
}

export const notImplemented = (name: string, phase: string): AdminCommand => ({
  name,
  usage: `${name}  (${phase}에서 구현 예정)`,
  run: async (_args, { print }) => {
    print(`${name}: not implemented (${phase}에서 구현 예정)`)
    return 1
  },
})
