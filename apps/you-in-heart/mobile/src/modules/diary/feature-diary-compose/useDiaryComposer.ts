import { toKstDate } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { usePinSuggestionFlow } from '@/modules/map/feature-pin-suggestion/usePinSuggestionFlow'
import { enqueuePhotos, useEntryUploads } from '@/modules/media/data-access-media/useUploadPhotos'
import type { LibraryAsset } from '@/modules/media/util-pick-assets/pick-assets'
import { useDiaryEntry } from '../data-access-diary/useDiaryEntry'
import { type SaveDiaryInput, useSaveDiary } from '../data-access-diary/useSaveDiary'
import { summarizeUploads } from './upload-summary'

type DiaryForm = { happenedOn: string; title: string; body: string }

const toSaveInput = (entryId: string | undefined, { happenedOn, title, body }: DiaryForm): SaveDiaryInput => {
  const trimmedTitle = title.trim()
  if (entryId) return { mode: 'edit', id: entryId, body: { happenedOn, title: trimmedTitle || null, body } }
  return { mode: 'create', body: { happenedOn, ...(trimmedTitle ? { title: trimmedTitle } : {}), body } }
}

// SCR-05 작성·수정 상태. 저장 → (사진이 있으면) 업로드 큐에 넣고 진행을 보여주다가 모두 올라가면 상세로 간다.
// 사진이 있으면 저장 뒤 핀 제안(2B.3)을 띄우고, 시트를 닫을 때까지는 상세로 넘어가지 않는다.
// 화면을 닫아도 큐는 루트의 실행기가 이어서 올린다
export const useDiaryComposer = (entryId: string | undefined) => {
  const isEdit = entryId !== undefined
  const existing = useDiaryEntry(entryId ?? null)
  const save = useSaveDiary()
  const pins = usePinSuggestionFlow()
  const [form, setForm] = useState<DiaryForm>(() => ({ happenedOn: toKstDate(Date.now()), title: '', body: '' }))
  const [assets, setAssets] = useState<LibraryAsset[]>([])
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const isPrefilled = useRef(false)
  const uploads = useEntryUploads(savedEntryId)
  const summary = summarizeUploads(uploads)

  // 수정: 서버 값으로 한 번만 채운다(다시 받아도 입력 중인 글을 덮지 않는다)
  useEffect(() => {
    if (!existing.data || isPrefilled.current) return
    isPrefilled.current = true
    setForm({ happenedOn: existing.data.happenedOn, title: existing.data.title ?? '', body: existing.data.body })
  }, [existing.data])

  // 수정은 상세에서 왔으니 돌아가고, 새 기록은 상세로 바꿔 연다
  const leave = (id: string) => (isEdit ? router.back() : router.replace(`/diary/${id}`))

  const isAllUploaded = savedEntryId !== null && summary.total > 0 && summary.done === summary.total
  useEffect(() => {
    if (isAllUploaded && savedEntryId && !pins.isPending) leave(savedEntryId)
    // 모두 올라가고 핀 제안이 끝난 순간 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllUploaded, pins.isPending])

  const existingPhotos = existing.data?.photos ?? []
  const hasContent = form.body.trim() !== '' || form.title.trim() !== '' || assets.length > 0
  const isReady = !isEdit || existing.data !== undefined
  const canSave = isReady && hasContent && !save.isPending && savedEntryId === null

  const submit = () => {
    if (!canSave) return
    save.mutate(toSaveInput(entryId, form), {
      onSuccess: (entry) => {
        if (assets.length === 0) return leave(entry.id)
        const assetIds = assets.map((asset) => asset.id)
        enqueuePhotos(entry.id, assetIds)
        setSavedEntryId(entry.id)
        pins.start(entry.id, assetIds)
      },
    })
  }

  const close = () => (savedEntryId ? leave(savedEntryId) : router.back())

  return {
    form,
    setForm,
    assets,
    setAssets,
    existingPhotos,
    save,
    savedEntryId,
    uploads,
    summary,
    canSave,
    submit,
    close,
    pins,
  }
}
