import { useState } from 'react'
import TxtImportScreen from '@/modules/quote/feature-txt-import/TxtImportScreen'
import type { ImportFile } from '@/modules/quote/feature-txt-import/useTxtImport'
import { pendingShare } from '@/modules/quote/util-share/pending-share'

// 공유로 받은 .txt 가 있으면 한 번만 꺼내 바로 읽는다(꺼낸 뒤 비운다)
const takeSharedTxt = (): ImportFile | null => {
  const payload = pendingShare.getState().payload
  if (payload?.kind !== 'txt-file') return null
  pendingShare.getState().clear()
  return payload.file
}

// /quotes/import — 보관함의 "대화 내보내기 파일 가져오기" 또는 카톡 .txt 공유(4D)
const QuoteImportRoute = () => {
  const [initialFile] = useState(takeSharedTxt)
  return <TxtImportScreen initialFile={initialFile} />
}

export default QuoteImportRoute
