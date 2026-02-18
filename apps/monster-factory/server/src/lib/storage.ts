import { createClient } from '@supabase/supabase-js'
import type { GrowthStage } from '@monster-factory/shared'

const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

const BUCKET = 'monster-images'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const buildPath = (
  userId: string,
  monsterId: string,
  growthStage: GrowthStage,
): string => {
  if (!UUID_RE.test(userId) || !UUID_RE.test(monsterId)) {
    throw new Error('Invalid userId or monsterId format')
  }
  return `monsters/${userId}/${monsterId}/${growthStage}.svg`
}

export const uploadMonsterImage = async (
  userId: string,
  monsterId: string,
  growthStage: GrowthStage,
  buffer: Buffer,
): Promise<string | null> => {
  if (!supabase) {
    console.warn('[storage] Supabase not configured, skipping upload')
    return null
  }

  try {
    const path = buildPath(userId, monsterId, growthStage)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      })

    if (error) {
      console.error('[storage] Upload failed:', error.message)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[storage] Upload error:', msg)
    return null
  }
}
