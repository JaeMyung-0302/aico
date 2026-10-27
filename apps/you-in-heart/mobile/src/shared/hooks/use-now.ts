import { useEffect, useState } from 'react'

// 남은 시간 표시처럼 주기적으로 다시 그려야 하는 화면용 현재 시각(ms)
export const useNow = (intervalMs: number): number => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
