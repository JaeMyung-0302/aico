// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UpgradePayload {
  statType: 'hp' | 'atk' | 'def' | 'spd' | 'crit'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PERMANENT_STAT_BASE_COST = 50
const PERMANENT_STAT_COST_GROWTH = 1.3
const MAX_PERMANENT_STAT_LEVEL = 20

const STAT_COLUMNS: Record<string, string> = {
  hp: 'permanent_hp',
  atk: 'permanent_atk',
  def: 'permanent_def',
  spd: 'permanent_spd',
  crit: 'permanent_crit',
}

const calcCost = (currentLevel: number): number =>
  Math.floor(PERMANENT_STAT_BASE_COST * Math.pow(PERMANENT_STAT_COST_GROWTH, currentLevel))

serve(async (req: Request) => {
  // CORS preflight
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

    // 유저 인증 확인
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: UpgradePayload = await req.json()
    const column = STAT_COLUMNS[payload.statType]
    if (!column) {
      return new Response(JSON.stringify({ error: 'Invalid stat type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // 모든 캐릭터의 해당 스탯 레벨 조회
    const { data: characters, error: charError } = await adminClient
      .from('sb_characters')
      .select(`id, ${column}`)
      .eq('user_id', user.id)

    if (charError) {
      return new Response(JSON.stringify({ error: 'Character query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 영구 스탯은 계정 단위이므로 첫 캐릭터 기준
    const currentLevel = characters?.[0]?.[column] ?? 0
    if (currentLevel >= MAX_PERMANENT_STAT_LEVEL) {
      return new Response(JSON.stringify({ error: 'Max level reached' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cost = calcCost(currentLevel)

    // 원자적 골드 차감 (TOCTOU 방지 — RPC가 잔액 검사 + 차감을 한 트랜잭션으로 처리)
    const { data: remainingGold, error: goldError } = await adminClient.rpc('sb_deduct_meta_gold', {
      p_user_id: user.id,
      p_amount: cost,
    })

    if (goldError) {
      return new Response(JSON.stringify({ error: 'Insufficient meta gold', required: cost }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 모든 캐릭터의 영구 스탯 일괄 업그레이드
    const charIds = (characters ?? []).map((c: { id: string }) => c.id)
    if (charIds.length > 0) {
      const { error: upgradeError } = await adminClient
        .from('sb_characters')
        .update({ [column]: currentLevel + 1 })
        .in('id', charIds)

      if (upgradeError) {
        // 스탯 업그레이드 실패 시 골드 롤백
        const { error: rollbackError } = await adminClient.rpc('sb_increment_meta_gold', {
          p_user_id: user.id,
          p_amount: cost,
        })

        if (rollbackError) {
          console.error('[CRITICAL] Gold rollback failed', {
            userId: user.id,
            amount: cost,
            error: rollbackError.message,
          })
        }

        const errorPayload = rollbackError
          ? { error: 'Stat upgrade failed and rollback failed', rollbackFailed: true, userId: user.id, amount: cost }
          : { error: 'Stat upgrade failed' }

        return new Response(JSON.stringify(errorPayload), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({
      statType: payload.statType,
      newLevel: currentLevel + 1,
      cost,
      remainingGold,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
