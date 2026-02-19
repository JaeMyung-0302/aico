import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import { ATTENDANCE_BONUS } from '@soulblade/shared'
import { supabase } from '@/lib/supabase'
import styles from './DailyPage.module.scss'

const cx = classnames.bind(styles)

interface DailyState {
  readonly consecutiveDays: number
  readonly claimed: boolean
  readonly loading: boolean
}

export const DailyPage = () => {
  const navigate = useNavigate()
  const [state, setState] = useState<DailyState>({
    consecutiveDays: 0,
    claimed: false,
    loading: true,
  })

  useEffect(() => {
    const fetchDaily = async () => {
      if (!supabase) {
        setState((prev) => ({ ...prev, loading: false }))
        return
      }

      try {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('daily_progress')
          .select('consecutive_days, attendance_claimed')
          .eq('date', today)
          .single()

        setState({
          consecutiveDays: data?.consecutive_days ?? 0,
          claimed: data?.attendance_claimed ?? false,
          loading: false,
        })
      } catch {
        setState((prev) => ({ ...prev, loading: false }))
      }
    }

    fetchDaily()
  }, [])

  const handleClaim = async () => {
    if (!supabase) return
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await supabase.functions.invoke('claim-daily', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.data) {
        setState({
          consecutiveDays: response.data.consecutiveDays,
          claimed: true,
          loading: false,
        })
      } else {
        setState((prev) => ({ ...prev, loading: false }))
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }

  const attendanceDays = Object.entries(ATTENDANCE_BONUS)

  return (
    <div className={cx('daily')}>
      <button className={cx('backBtn')} onClick={() => navigate('/')}>
        뒤로
      </button>

      <h1 className={cx('title')}>일일 출석</h1>
      <p className={cx('streak')}>
        연속 출석: <strong>{state.consecutiveDays}일</strong>
      </p>

      <div className={cx('calendar')}>
        {attendanceDays.map(([day, gold]) => {
          const dayNum = Number(day)
          const isPast = dayNum <= state.consecutiveDays
          const isToday = dayNum === state.consecutiveDays + 1

          return (
            <div
              key={day}
              className={cx('calendarDay', {
                past: isPast,
                today: isToday && !state.claimed,
              })}
            >
              <span className={cx('dayNum')}>{day}일</span>
              <span className={cx('reward')}>{gold}G</span>
              {isPast && <span className={cx('check')}>V</span>}
            </div>
          )
        })}
      </div>

      <button
        className={cx('claimBtn')}
        onClick={handleClaim}
        disabled={state.claimed || state.loading}
      >
        {state.claimed ? '수령 완료' : state.loading ? '로딩...' : '출석 보상 수령'}
      </button>
    </div>
  )
}
