import type { ShareIntent, ShareIntentFile } from 'expo-share-intent'
import type { ImportFile } from '../feature-txt-import/useTxtImport'

// 공유로 받은 것 → 갈 곳: 텍스트 = 문구 저장(SCR-14), .txt = 가져오기(SCR-15), 이미지 = 스크린샷 시트
export type SharePayload = { kind: 'text'; text: string } | { kind: 'txt-file'; file: ImportFile } | { kind: 'image'; uri: string }

// Android 는 파일 경로를 scheme 없이 줄 수 있다
const toFileUri = (path: string): string => (path.startsWith('/') ? `file://${path}` : path)

const isTxtFile = ({ mimeType, fileName }: ShareIntentFile): boolean =>
  mimeType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')

const fromFile = (file: ShareIntentFile): SharePayload | null => {
  if (file.mimeType.startsWith('image/')) return { kind: 'image', uri: toFileUri(file.path) }
  if (isTxtFile(file)) return { kind: 'txt-file', file: { uri: toFileUri(file.path), name: file.fileName, size: file.size } }
  return null
}

// 파일이 있으면 파일을 따른다(첫 개만). 공유 본문은 로그에 남기지 않는다
export const resolveSharePayload = (intent: ShareIntent): SharePayload | null => {
  const first = intent.files?.[0]
  if (first) return fromFile(first)
  const text = intent.text?.trim() ?? ''
  return text.length > 0 ? { kind: 'text', text } : null
}
