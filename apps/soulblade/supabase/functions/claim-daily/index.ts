// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const ATTENDANCE_BONUS: Record<number, number> = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
  6: 40,
  7: 100,
}

// UTC 기준 날짜 계산 (Edge Function 런타임은 항상 UTC)
const getToday = (): string => {
  return new Date().toISOString().split('T')[0] as string
}

const getYesterday = (): string => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0] as string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    )
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const today = getToday()

    // 오늘 출석 기록 조회
    const { data: todayRecord } = await adminClient
      .from('sb_daily_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    // 이미 수령 완료
    if (todayRecord?.attendance_claimed) {
      return new Response(JSON.stringify({ error: 'Already claimed today' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 어제 출석 기록 조회 (연속 출석 계산, UTC 기준)
    const yesterdayStr = getYesterday()

    const { data: yesterdayRecord } = await adminClient
      .from('sb_daily_progress')
      .select('consecutive_days')
      .eq('user_id', user.id)
      .eq('date', yesterdayStr)
      .single()

    const prevConsecutive = yesterdayRecord?.consecutive_days ?? 0
    const newConsecutive = prevConsecutive + 1
    const bonusDay = Math.min(newConsecutive, 7)
    const goldReward = ATTENDANCE_BONUS[bonusDay] ?? 10

    // 출석 기록 upsert
    if (todayRecord) {
      const { error: updateError } = await adminClient
        .from('sb_daily_progress')
        .update({
          attendance_claimed: true,
          consecutive_days: newConsecutive,
        })
        .eq('id', todayRecord.id)

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Update failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      const { error: insertError } = await adminClient
        .from('sb_daily_progress')
        .insert({
          user_id: user.id,
          date: today,
          attendance_claimed: true,
          consecutive_days: newConsecutive,
        })

      if (insertError) {
        return new Response(JSON.stringify({ error: 'Insert failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 메타 골드 지급 (원자적)
    const { data: newGold, error: goldError } = await adminClient.rpc(
      'sb_increment_meta_gold',
      {
        p_user_id: user.id,
        p_amount: goldReward,
      },
    )

    // 골드 지급 실패 시 출석 기록 롤백
    if (goldError) {
      const recordId = todayRecord?.id
      if (recordId) {
        await adminClient
          .from('sb_daily_progress')
          .update({ attendance_claimed: false })
          .eq('id', recordId)
      } else {
        await adminClient
          .from('sb_daily_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('date', today)
      }

      return new Response(
        JSON.stringify({
          error: 'Gold increment failed, attendance rolled back',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        consecutiveDays: newConsecutive,
        goldReward,
        newGold,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
