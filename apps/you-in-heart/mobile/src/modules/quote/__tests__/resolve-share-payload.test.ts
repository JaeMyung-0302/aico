import type { ShareIntent, ShareIntentFile } from 'expo-share-intent'
import { resolveSharePayload } from '../util-share/resolve-share-payload'

const file = (overrides: Partial<ShareIntentFile>): ShareIntentFile => ({
  fileName: 'a.bin',
  mimeType: 'application/octet-stream',
  path: 'file:///tmp/a.bin',
  size: 10,
  width: null,
  height: null,
  duration: null,
  ...overrides,
})

const intent = (overrides: Partial<ShareIntent>): ShareIntent => ({
  text: null,
  files: null,
  type: null,
  webUrl: null,
  ...overrides,
})

describe('resolveSharePayload (plan 4D.1)', () => {
  it('텍스트 공유는 문구 저장 화면으로 간다(앞뒤 공백 제거)', () => {
    expect(resolveSharePayload(intent({ type: 'text', text: '  내일은 내가 데리러 갈게  ' }))).toEqual({
      kind: 'text',
      text: '내일은 내가 데리러 갈게',
    })
  })

  it('빈 텍스트·알 수 없는 파일은 무시한다', () => {
    expect(resolveSharePayload(intent({ type: 'text', text: '   ' }))).toBeNull()
    expect(resolveSharePayload(intent({ type: 'file', files: [file({})] }))).toBeNull()
    expect(resolveSharePayload(intent({}))).toBeNull()
  })

  it('.txt 파일(text/plain 또는 확장자)은 txt 가져오기로 간다', () => {
    expect(
      resolveSharePayload(
        intent({ type: 'file', files: [file({ fileName: 'KakaoTalk.txt', mimeType: 'text/plain', path: '/data/k.txt', size: 99 })] }),
      ),
    ).toEqual({ kind: 'txt-file', file: { uri: 'file:///data/k.txt', name: 'KakaoTalk.txt', size: 99 } })
    expect(
      resolveSharePayload(intent({ type: 'file', files: [file({ fileName: 'chat.TXT', path: 'file:///x/chat.TXT', size: null })] })),
    ).toEqual({ kind: 'txt-file', file: { uri: 'file:///x/chat.TXT', name: 'chat.TXT', size: null } })
  })

  it('이미지는 스크린샷 저장으로 간다(첫 장만)', () => {
    expect(
      resolveSharePayload(
        intent({
          type: 'media',
          files: [file({ mimeType: 'image/png', path: 'file:///s/1.png' }), file({ mimeType: 'image/png', path: 'file:///s/2.png' })],
        }),
      ),
    ).toEqual({ kind: 'image', uri: 'file:///s/1.png' })
  })

  it('파일이 있으면 함께 온 텍스트보다 파일을 따른다', () => {
    expect(
      resolveSharePayload(intent({ type: 'media', text: '사진', files: [file({ mimeType: 'image/jpeg', path: 'file:///p.jpg' })] })),
    ).toEqual({ kind: 'image', uri: 'file:///p.jpg' })
  })
})
