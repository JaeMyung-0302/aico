import { DISPLAY_JPEG_QUALITY, prepareDisplayImage } from '../data-access-media/prepare-display-image'

type FakeRef = { width: number; height: number; saveAsync: jest.Mock }

const makeRef = (width: number, height: number): FakeRef => ({
  width,
  height,
  saveAsync: jest.fn(async () => ({ uri: 'file:///cache/display.jpg', width, height })),
})

// 네이티브 이미지 처리만 대체한다: manipulate(원본) → renderAsync, manipulate(ref).resize → renderAsync
type FakeContext = { source: unknown; resize: jest.Mock; renderAsync: jest.Mock }

let mockContexts: FakeContext[] = []
const mockManipulate = jest.fn<FakeContext, [unknown]>()
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: { manipulate: (source: unknown) => mockManipulate(source) },
}))

const stubManipulator = (decoded: FakeRef, resized: FakeRef) => {
  mockManipulate.mockImplementation((source) => {
    const isDecoded = source === decoded
    const context: FakeContext = {
      source,
      resize: jest.fn(() => context),
      renderAsync: jest.fn(async () => (isDecoded ? resized : decoded)),
    }
    mockContexts = [...mockContexts, context]
    return context
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockContexts = []
})

describe('prepareDisplayImage (표시용 후보: 긴 변 2048 이하 JPEG q0.85)', () => {
  it('가로가 긴 사진은 너비를 2048로 줄여 JPEG 0.85로 저장한다', async () => {
    const decoded = makeRef(4032, 3024)
    const resized = makeRef(2048, 1536)
    stubManipulator(decoded, resized)

    await expect(prepareDisplayImage('file:///IMG_0001.HEIC')).resolves.toEqual({
      uri: 'file:///cache/display.jpg',
      width: 2048,
      height: 1536,
    })
    expect(mockContexts[1]?.resize).toHaveBeenCalledWith({ width: 2048 })
    expect(resized.saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: DISPLAY_JPEG_QUALITY })
    expect(DISPLAY_JPEG_QUALITY).toBe(0.85)
  })

  it('세로가 긴 사진은 높이를 2048로 줄인다 (회전이 적용된 실제 크기 기준)', async () => {
    const decoded = makeRef(3024, 4032)
    const resized = makeRef(1536, 2048)
    stubManipulator(decoded, resized)

    await prepareDisplayImage('file:///IMG_0002.JPG')
    expect(mockContexts[1]?.resize).toHaveBeenCalledWith({ height: 2048 })
  })

  it('긴 변이 2048 이하이면 키우지 않고 그대로 JPEG 0.85로 다시 저장한다', async () => {
    const decoded = makeRef(1200, 900)
    stubManipulator(decoded, makeRef(0, 0))

    await expect(prepareDisplayImage('file:///small.png')).resolves.toMatchObject({ width: 1200, height: 900 })
    expect(mockContexts).toHaveLength(1)
    expect(decoded.saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.85 })
  })
})
