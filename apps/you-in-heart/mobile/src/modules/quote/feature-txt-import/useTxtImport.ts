import { type KakaoExportParseResult, parseKakaoExport } from '@you-in-heart/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { discardFile } from '@/modules/media/data-access-media/prepare-display-image'
import { readTextFile } from '../data-access-quote/file-info'
import { bulkCreateQuotes } from '../data-access-quote/quote-api'
import { QUOTES_QUERY_KEY } from '../data-access-quote/useQuotes'
import { chunkQuoteBatches, type ImportSelection, toQuoteItem } from '../util-quote/quote-batches'

export type ImportFile = { uri: string; name: string; size: number | null }

export type ImportStep =
  | { step: 'idle' }
  | { step: 'reading'; file: ImportFile }
  | { step: 'invalid'; file: ImportFile }
  | { step: 'select'; file: ImportFile; result: KakaoExportParseResult }

export const rawKey = (lineNo: number) => `raw-${lineNo}`

// 파싱 결과에서 고른 것만, 파일 순서대로 (메시지·못 읽은 줄)
const toSelections = (result: KakaoExportParseResult, keys: ReadonlySet<string>): ImportSelection[] => {
  const messages = result.messages
    .filter((message) => keys.has(message.id))
    .map((message) => ({ order: Number(message.id.slice(5)), selection: { kind: 'message' as const, ...message } }))
  const raws = result.unparsed
    .filter((line) => keys.has(rawKey(line.lineNo)))
    .map((line) => ({ order: line.lineNo, selection: { kind: 'raw' as const, ...line } }))
  return [...messages, ...raws].sort((a, b) => a.order - b.order).map(({ selection }) => selection)
}

// 기기 안에서 읽고 파싱한다. 원문은 이 함수 밖으로 나가지 않고, 문서 선택기가 만든 캐시 사본은 바로 지운다
const readExport = async (file: ImportFile): Promise<KakaoExportParseResult> => {
  try {
    return parseKakaoExport(await readTextFile(file.uri))
  } finally {
    discardFile(file.uri)
  }
}

// 200건·64KB 로 나눠 차례로 보낸다. 실패하면 보낸 묶음 수를 기억해 다시 시도할 때 이어서 보낸다
const useBulkSave = () => {
  const queryClient = useQueryClient()
  const sentBatches = useRef(0)
  const [progress, setProgress] = useState({ sent: 0, total: 0 })
  const mutation = useMutation({
    mutationFn: async (selections: readonly ImportSelection[]) => {
      const batches = chunkQuoteBatches(selections.map(toQuoteItem))
      setProgress({ sent: sentBatches.current, total: batches.length })
      await batches.slice(sentBatches.current).reduce(async (previous, batch) => {
        await previous
        await bulkCreateQuotes(batch)
        sentBatches.current += 1
        setProgress({ sent: sentBatches.current, total: batches.length })
      }, Promise.resolve())
    },
    onSuccess: async () => {
      sentBatches.current = 0
      await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY })
      router.replace('/quotes')
    },
  })
  const resetSent = () => {
    sentBatches.current = 0
  }
  return { mutation, progress, resetSent }
}

// 메시지가 하나도 없으면(빈 파일·다른 형식) 고를 것이 없다
const toReadStep = (file: ImportFile, result: KakaoExportParseResult | null): ImportStep =>
  result && result.messages.length > 0 ? { step: 'select', file, result } : { step: 'invalid', file }

// SCR-15 txt 가져오기 상태: 고르기 → 읽기(기기 안) → 고르기 화면 / 형식 오류 → 저장
export const useTxtImport = (initialFile: ImportFile | null) => {
  // 공유로 받은 파일은 읽는 중으로 시작한다
  const [state, setState] = useState<ImportStep>(() => (initialFile ? { step: 'reading', file: initialFile } : { step: 'idle' }))
  const [keys, setKeys] = useState<ReadonlySet<string>>(new Set())
  const save = useBulkSave()

  const load = async (file: ImportFile) => {
    setState({ step: 'reading', file })
    setKeys(new Set())
    save.resetSent()
    setState(toReadStep(file, await readExport(file).catch(() => null)))
  }

  const pick = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'text/plain', copyToCacheDirectory: true, multiple: false })
    const asset = picked.canceled ? null : picked.assets[0]
    if (asset) await load({ uri: asset.uri, name: asset.name, size: asset.size ?? null })
  }

  useEffect(() => {
    if (!initialFile) return
    readExport(initialFile)
      .catch(() => null)
      .then((result) => setState(toReadStep(initialFile, result)))
    // 공유로 받은 파일은 처음 한 번만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const result = state.step === 'select' ? state.result : null
  const allKeys = useMemo(
    () => (result ? [...result.messages.map((message) => message.id), ...result.unparsed.map((line) => rawKey(line.lineNo))] : []),
    [result],
  )
  const toggle = (key: string) =>
    setKeys((current) => (current.has(key) ? new Set([...current].filter((item) => item !== key)) : new Set([...current, key])))
  const toggleAll = () => setKeys((current) => (current.size === allKeys.length ? new Set() : new Set(allKeys)))
  const submit = () => {
    if (result && keys.size > 0) save.mutation.mutate(toSelections(result, keys))
  }

  return { state, keys, toggle, toggleAll, isAllSelected: allKeys.length > 0 && keys.size === allKeys.length, pick, submit, save }
}
