import { randomUUID } from 'node:crypto'
import type { PushMessage, PushSender } from '../../src/notifications/push.service'

export type FakePush = { sender: PushSender; sent: () => readonly PushMessage[]; reset: () => void }

// Expo Push 대역: 보낸 메시지를 모아 두고 항상 ok 티켓을 준다
export const createFakePush = (): FakePush => {
  let sent: readonly PushMessage[] = []
  const sender: PushSender = {
    send: async (messages) => {
      sent = [...sent, ...messages]
      return messages.map(() => ({ status: 'ok' as const, id: randomUUID() }))
    },
    getReceipts: async () => ({}),
  }
  return {
    sender,
    sent: () => sent,
    reset: () => {
      sent = []
    },
  }
}
