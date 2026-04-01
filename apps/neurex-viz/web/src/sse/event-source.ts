import type { SSEEvent } from '@neurex-viz/shared'

export const connectSSE = (onEvent: (event: SSEEvent) => void): { close: () => void } => {
  const source = new EventSource('/api/events')

  source.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data) as SSEEvent
      onEvent(event)
    } catch {
      // ignore malformed events
    }
  }

  source.onerror = () => {
    console.warn('[sse] Connection error, auto-reconnecting...')
  }

  source.onopen = () => {
    console.log('[sse] Connected')
    const status = document.getElementById('status')
    if (status) status.textContent = 'neurex-viz connected'
  }

  return {
    close: () => source.close(),
  }
}
