// 앱 tsconfig 에는 Node 타입이 없다(@types/node 미설치) → 이 검사에 쓰는 함수만 좁게 선언해 불러온다
type NodeFs = {
  readdirSync: (dir: string) => string[]
  readFileSync: (path: string, encoding: 'utf8') => string
  statSync: (path: string) => { isDirectory: () => boolean }
}
type NodePath = { join: (...parts: string[]) => string; relative: (from: string, to: string) => string; sep: string }
declare const __dirname: string
declare const __filename: string

const { readdirSync, readFileSync, statSync } = jest.requireActual<NodeFs>('fs')
const { join, relative, sep } = jest.requireActual<NodePath>('path')

// 색은 design-system/tokens 에만 둔다 (SCR-00 tokens.json). 그 밖에서 hex·rgb()가 보이면 실패
const SRC_ROOT = join(__dirname, '..', '..')
const TOKENS_DIR = join(SRC_ROOT, 'design-system', 'tokens') + sep
const SOURCE_FILE = /\.tsx?$/
const HARDCODED_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listSourceFiles(path)
    return SOURCE_FILE.test(name) ? [path] : []
  })

const findViolations = (path: string): string[] =>
  readFileSync(path, 'utf8')
    .split('\n')
    .flatMap((line, index) => (HARDCODED_COLOR.test(line) ? [`${relative(SRC_ROOT, path)}:${index + 1}`] : []))

describe('하드코딩 색 금지', () => {
  it('src/ 의 .ts/.tsx 는 design-system/tokens 밖에서 hex·rgb() 색을 쓰지 않는다', () => {
    // 이 검사 파일 자신(규칙 예시 문자열)은 제외한다
    const files = listSourceFiles(SRC_ROOT).filter((path) => !path.startsWith(TOKENS_DIR) && path !== __filename)
    expect(files.length).toBeGreaterThan(0)
    expect(files.flatMap(findViolations)).toEqual([])
  })

  it('검사 규칙이 hex·rgb()·rgba()를 잡아낸다', () => {
    expect(HARDCODED_COLOR.test("color: '#CC3355'")).toBe(true)
    expect(HARDCODED_COLOR.test("color: '#fff'")).toBe(true)
    expect(HARDCODED_COLOR.test("backgroundColor: 'rgba(23,23,26,0.45)'")).toBe(true)
    expect(HARDCODED_COLOR.test('COLORS.accent')).toBe(false)
  })
})
