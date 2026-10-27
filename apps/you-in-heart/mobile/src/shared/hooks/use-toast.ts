import { useCallback, useEffect, useRef, useState } from 'react'

const TOAST_MS = 2500

// 짧은 안내(Toast) 한 줄: show 하면 2.5초 뒤 사라진다. 다시 부르면 시간을 새로 센다
export const useToast = (durationMs = TOAST_MS) => {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current)
      setMessage(next)
      timer.current = setTimeout(() => setMessage(null), durationMs)
    },
    [durationMs],
  )

  return { message, show }
}
