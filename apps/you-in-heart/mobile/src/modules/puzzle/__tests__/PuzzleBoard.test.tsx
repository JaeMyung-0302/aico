import { render, screen } from '@testing-library/react-native'
import PuzzleBoard, { PIECE_PHOTO_OPACITY } from '../ui-puzzle-board/PuzzleBoard'

const ENTRY = '01890a5d-ac96-774b-bcce-b302099a8702'
const view = {
  pieceByIndex: new Map([[0, { dayIndex: 0, date: '2026-10-20', entryId: ENTRY, thumbUrl: 'https://x/t.jpg' }]]),
  elapsed: 3,
  todayIndex: 2,
  isComplete: false,
}

describe('PuzzleBoard', () => {
  it('채운 칸은 배경 사진을 선명하게 드러내고, 그날 사진은 그 위에 반투명하게 겹친다(배경이 가려지지 않는다)', async () => {
    await render(<PuzzleBoard pieceCount={9} backgroundUrl="https://x/bg.jpg" view={view} width={90} height={90} />)
    const piece = screen.getByTestId('puzzle-piece-0')
    expect(screen.getByTestId('puzzle-piece-0-background')).toBeTruthy()
    const photo = screen.getByTestId('puzzle-piece-0-photo')
    expect(piece).toBeTruthy()
    expect(PIECE_PHOTO_OPACITY).toBeGreaterThan(0)
    expect(PIECE_PHOTO_OPACITY).toBeLessThan(1)
    expect(photo.props.opacity).toBe(PIECE_PHOTO_OPACITY)
  })

  it('퍼즐판 사진이 없으면 그날 사진만 그대로 놓는다', async () => {
    await render(<PuzzleBoard pieceCount={9} backgroundUrl={null} view={view} width={90} height={90} />)
    expect(screen.queryByTestId('puzzle-piece-0-background')).toBeNull()
    expect(screen.getByTestId('puzzle-piece-0-photo').props.opacity).toBe(1)
  })
})
