// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RunPayload {
  characterId: string
  classType: string
  stageId: string
  score: number
  survivedSeconds: number
  monstersKilled: number
  bossKilled: boolean
  maxLevel: number
  skillsAcquired: string[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// 스테이지별 메타 골드 기본 보상
const STAGE_META_GOLD: Record<string, number> = {
  serpent_forest: 50,
  ice_cave: 80,
  flame_castle: 120,
}

// 스테이지별 지속 시간 (초)
const STAGE_DURATION: Record<string, number> = {
  serpent_forest: 900,
  ice_cave: 1200,
  flame_castle: 1500,
}

// 등급별 드롭 확률
const GRADE_DROP_RATES = [
  { grade: 'common', rate: 0.5 },
  { grade: 'uncommon', rate: 0.28 },
  { grade: 'rare', rate: 0.15 },
  { grade: 'epic', rate: 0.06 },
  { grade: 'legendary', rate: 0.01 },
]

const EQUIPMENT_TYPES = ['weapon', 'armor', 'accessory'] as const
const EQUIPMENT_TAGS = [
  'fire',
  'ice',
  'vampire',
  'thunder',
  'holy',
  'poison',
] as const

const GRADE_STAT_RANGES: Record<string, { min: number; max: number }> = {
  common: { min: 1, max: 5 },
  uncommon: { min: 4, max: 10 },
  rare: { min: 8, max: 18 },
  epic: { min: 15, max: 30 },
  legendary: { min: 25, max: 50 },
}

const STAT_KEYS = ['hp', 'atk', 'def', 'spd'] as const

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

const pickRandom = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]

const rollGrade = (): string => {
  const roll = Math.random()
  let cumulative = 0
  for (const { grade, rate } of GRADE_DROP_RATES) {
    cumulative += rate
    if (roll <= cumulative) return grade
  }
  return 'common'
}

const generateEquipment = (
  userId: string,
): {
  user_id: string
  type: string
  grade: string
  name: string
  tags: string[]
  stats: Record<string, number>
} => {
  const grade = rollGrade()
  const type = pickRandom(EQUIPMENT_TYPES)
  const range = GRADE_STAT_RANGES[grade]
  const tagCount = grade === 'legendary' ? 3 : grade === 'epic' ? 2 : 1
  const tags: string[] = []
  for (let i = 0; i < tagCount; i++) {
    const tag = pickRandom(EQUIPMENT_TAGS)
    if (!tags.includes(tag)) tags.push(tag)
  }

  const stats: Record<string, number> = {}
  const statCount = randomBetween(1, 3)
  for (let i = 0; i < statCount; i++) {
    const key = pickRandom(STAT_KEYS)
    stats[key] = (stats[key] ?? 0) + randomBetween(range.min, range.max)
  }

  const gradePrefix: Record<string, string> = {
    common: '낡은',
    uncommon: '견고한',
    rare: '빛나는',
    epic: '고대의',
    legendary: '전설의',
  }
  const typeNames: Record<string, string> = {
    weapon: '무기',
    armor: '갑옷',
    accessory: '장신구',
  }

  return {
    user_id: userId,
    type,
    grade,
    name: `${gradePrefix[grade]} ${tags[0] ?? ''} ${typeNames[type]}`.trim(),
    tags,
    stats,
  }
}

// 페이로드 검증
const validatePayload = (payload: RunPayload): string | null => {
  if (
    typeof payload.characterId !== 'string' ||
    payload.characterId.length === 0
  ) {
    return 'Invalid characterId'
  }
  if (typeof payload.score !== 'number' || payload.score < 0) {
    return 'Invalid score'
  }
  if (
    typeof payload.monstersKilled !== 'number' ||
    payload.monstersKilled < 0
  ) {
    return 'Invalid monstersKilled'
  }
  if (
    typeof payload.survivedSeconds !== 'number' ||
    payload.survivedSeconds < 0
  ) {
    return 'Invalid survivedSeconds'
  }
  if (typeof payload.maxLevel !== 'number' || payload.maxLevel < 1) {
    return 'Invalid maxLevel'
  }
  if (typeof payload.bossKilled !== 'boolean') {
    return 'Invalid bossKilled'
  }
  if (!Array.isArray(payload.skillsAcquired)) {
    return 'Invalid skillsAcquired'
  }
  return null
}

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

    const payload: RunPayload = await req.json()

    // 페이로드 검증
    const validationError = validatePayload(payload)
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // characterId 소유권 확인
    const { data: character, error: charError } = await adminClient
      .from('sb_characters')
      .select('id')
      .eq('id', payload.characterId)
      .eq('user_id', user.id)
      .single()

    if (charError || !character) {
      return new Response(
        JSON.stringify({ error: 'Character not found or not owned' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 서버 사이드 검증
    const duration = STAGE_DURATION[payload.stageId]
    if (!duration) {
      return new Response(JSON.stringify({ error: 'Invalid stage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (payload.survivedSeconds > duration + 5) {
      return new Response(JSON.stringify({ error: 'Invalid survived time' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 메타 골드 계산
    const baseReward = STAGE_META_GOLD[payload.stageId] ?? 50
    const survivalRatio = Math.min(payload.survivedSeconds / duration, 1.0)
    const bossBonus = payload.bossKilled ? 2.0 : 1.0
    const metaGoldEarned = Math.floor(baseReward * survivalRatio * bossBonus)

    // 장비 드롭 생성 (1-3개)
    const dropCount = randomBetween(1, payload.bossKilled ? 3 : 2)

    const equipmentInserts = Array.from({ length: dropCount }, () =>
      generateEquipment(user.id),
    )
    const { data: droppedEquipment, error: equipError } = await adminClient
      .from('sb_equipment')
      .insert(equipmentInserts)
      .select('id')

    if (equipError) {
      return new Response(
        JSON.stringify({ error: 'Equipment insert failed' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const equipmentIds = (droppedEquipment ?? []).map(
      (e: { id: string }) => e.id,
    )

    // game_runs 기록 (service_role로 INSERT)
    const { error: runError } = await adminClient.from('sb_game_runs').insert({
      user_id: user.id,
      character_id: payload.characterId,
      class_type: payload.classType,
      stage_id: payload.stageId,
      score: payload.score,
      survived_seconds: payload.survivedSeconds,
      monsters_killed: payload.monstersKilled,
      boss_killed: payload.bossKilled,
      max_level: payload.maxLevel,
      meta_gold_earned: metaGoldEarned,
      skills_acquired: payload.skillsAcquired,
      equipment_dropped: equipmentIds,
    })

    if (runError) {
      return new Response(JSON.stringify({ error: 'Run insert failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 메타 골드 원자적 증가 (RPC)
    const { error: goldError } = await adminClient.rpc(
      'sb_increment_meta_gold',
      {
        p_user_id: user.id,
        p_amount: metaGoldEarned,
      },
    )

    if (goldError) {
      return new Response(JSON.stringify({ error: 'Gold increment failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        metaGoldEarned,
        droppedEquipment: equipmentInserts,
        equipmentIds,
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
