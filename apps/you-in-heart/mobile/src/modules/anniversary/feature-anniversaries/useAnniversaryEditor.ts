import type { AnniversaryItem, UpdateCustomAnniversaryRequest } from '@you-in-heart/shared'
import { useState } from 'react'
import { isApiErrorKind } from '@/shared/api/api-error'
import { useDeleteAnniversary, useSaveAnniversary } from '../data-access-anniversary/useSaveAnniversary'
import type { AnniversaryFormValue } from '../ui-anniversary-form/AnniversaryForm'

const SAVE_ERROR = '저장하지 못했어요. 잠시 후 다시 시도해 주세요'

export type AnniversarySheet = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; item: AnniversaryItem }

// 날짜를 그대로 두면 제목만 보낸다 — 목록의 날짜는 올해 돌아오는 날이라 그대로 보내면 원래 날짜가 바뀐다
const toUpdateBody = (item: AnniversaryItem, value: AnniversaryFormValue): UpdateCustomAnniversaryRequest =>
  value.date === item.date ? { title: value.title } : { title: value.title, date: value.date }

// SCR-04 추가·수정 시트 상태와 저장·삭제. 409(유예 중 쓰기)면 시트를 닫고 SCR-18 안내, 그 밖의 실패는 시트 안에 보여준다
export const useAnniversaryEditor = () => {
  const save = useSaveAnniversary()
  const remove = useDeleteAnniversary()
  const [sheet, setSheet] = useState<AnniversarySheet>({ mode: 'closed' })
  const [isBlockedVisible, setIsBlockedVisible] = useState(false)

  const closeSheet = () => {
    setSheet({ mode: 'closed' })
    save.reset()
    remove.reset()
  }

  const handleWriteError = (error: unknown) => {
    if (!isApiErrorKind(error, 'COUPLE_UNLINKING')) return
    setSheet({ mode: 'closed' })
    setIsBlockedVisible(true)
  }
  const writeOptions = { onSuccess: closeSheet, onError: handleWriteError }

  const submit = (value: AnniversaryFormValue) => {
    if (sheet.mode === 'create') save.mutate({ mode: 'create', body: value }, writeOptions)
    if (sheet.mode === 'edit') {
      save.mutate({ mode: 'edit', id: sheet.item.id, body: toUpdateBody(sheet.item, value) }, writeOptions)
    }
  }

  const deleteCurrent = () => {
    if (sheet.mode === 'edit') remove.mutate(sheet.item.id, writeOptions)
  }

  const writeError = save.error ?? remove.error
  return {
    sheet,
    openCreate: () => setSheet({ mode: 'create' }),
    openEdit: (item: AnniversaryItem) => setSheet({ mode: 'edit', item }),
    closeSheet,
    submit,
    deleteCurrent,
    isSubmitting: save.isPending,
    isDeleting: remove.isPending,
    errorMessage: writeError && !isApiErrorKind(writeError, 'COUPLE_UNLINKING') ? SAVE_ERROR : null,
    isBlockedVisible,
    hideBlocked: () => setIsBlockedVisible(false),
  }
}
