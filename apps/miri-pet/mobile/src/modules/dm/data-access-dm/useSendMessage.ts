import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { createClientMessageId } from '../util-dm/dm-display'
import { sendMessage } from './dm-api'
import { DM_QUERY_KEY } from './query-keys'
import { prependMessage } from './useMessages'

export type PendingMessage = {
  clientMessageId: string
  body?: string
  image?: PickedImage
  // 사진을 이미 올렸으면 재시도 때 다시 올리지 않는다
  mediaId?: string
  status: 'sending' | 'failed'
}

type Draft = { body?: string; image?: PickedImage }

// 낙관적 전송: 말풍선을 먼저 보여주고, 실패하면 같은 clientMessageId로 다시 보낸다(서버 멱등)
export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<readonly PendingMessage[]>([])
  // 재시도 시 최신 항목(업로드한 mediaId 포함)을 읽기 위한 참조
  const pendingRef = useRef<readonly PendingMessage[]>([])

  const update = useCallback((next: (items: readonly PendingMessage[]) => readonly PendingMessage[]) => {
    pendingRef.current = next(pendingRef.current)
    setPending(pendingRef.current)
  }, [])

  const patch = useCallback(
    (clientMessageId: string, changes: Partial<PendingMessage>) =>
      update((items) => items.map((item) => (item.clientMessageId === clientMessageId ? { ...item, ...changes } : item))),
    [update],
  )

  const deliver = useCallback(
    async (item: PendingMessage) => {
      patch(item.clientMessageId, { status: 'sending' })
      try {
        const mediaId = item.mediaId ?? (item.image ? await uploadImage(item.image, 'DM') : undefined)
        if (mediaId) patch(item.clientMessageId, { mediaId })
        const message = await sendMessage(conversationId, {
          clientMessageId: item.clientMessageId,
          ...(item.body ? { body: item.body } : {}),
          ...(mediaId ? { mediaId } : {}),
        })
        prependMessage(queryClient, message)
        update((items) => items.filter((entry) => entry.clientMessageId !== item.clientMessageId))
        queryClient.invalidateQueries({ queryKey: [...DM_QUERY_KEY, 'conversations'] }).catch(() => undefined)
      } catch {
        patch(item.clientMessageId, { status: 'failed' })
      }
    },
    [conversationId, patch, queryClient, update],
  )

  const send = useCallback(
    ({ body, image }: Draft) => {
      const text = body?.trim()
      if (!text && !image) return
      const item: PendingMessage = {
        clientMessageId: createClientMessageId(),
        ...(text ? { body: text } : {}),
        ...(image ? { image } : {}),
        status: 'sending',
      }
      update((items) => [...items, item])
      deliver(item).catch(() => undefined)
    },
    [deliver, update],
  )

  const retry = useCallback(
    (clientMessageId: string) => {
      const item = pendingRef.current.find((entry) => entry.clientMessageId === clientMessageId)
      if (item) deliver(item).catch(() => undefined)
    },
    [deliver],
  )

  return { pending, send, retry }
}
