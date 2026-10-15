import { useEffect, useState } from 'react'

const DEFAULT_DURATION_MS = 3000

// 토스트처럼 잠깐 보였다 사라지는 메시지. show를 다시 부르면 표시 시간이 처음부터 시작된다
export const useTransientMessage = (durationMs = DEFAULT_DURATION_MS) => {
  const [entry, setEntry] = useState<{ message: string } | null>(null)

  useEffect(() => {
    if (!entry) return
    const timer = setTimeout(() => setEntry(null), durationMs)
    return () => clearTimeout(timer)
  }, [entry, durationMs])

  return {
    message: entry?.message ?? null,
    // 매번 새 객체 → 같은 문구여도 타이머가 다시 시작된다
    show: (message: string) => setEntry({ message }),
  }
}
