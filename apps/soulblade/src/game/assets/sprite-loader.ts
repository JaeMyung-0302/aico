/**
 * 스프라이트 에셋 로더
 * PNG 이미지를 TextureLoader로 비동기 로드, 실패 시 프로시저럴 fallback
 *
 * 사용법:
 *   const { textures } = useSpriteTextures()
 *   // textures.player.Warrior → 이미지 텍스처 또는 프로시저럴 CanvasTexture
 */

import { useState, useEffect } from 'react'
import { TextureLoader, LinearFilter, ClampToEdgeWrapping, RepeatWrapping } from 'three'
import type { Texture } from 'three'
import type { CharacterClass, MapId, NpcType } from '@soulblade/shared'
import { getSpriteTextures } from './sprite-generator'
import type { SpriteTextures } from './sprite-generator'
import {
  PLAYER_SPRITE_ASSETS,
  ENTITY_SPRITE_ASSETS,
  BACKGROUND_ASSETS,
  NPC_SPRITE_ASSETS,
  OBSTACLE_SPRITE_ASSETS,
} from './sprite-config'
import type { SpriteAssetConfig } from './sprite-config'

const loader = new TextureLoader()

// 단일 스프라이트 텍스처 로드 (실패 시 null)
const loadSpriteTexture = (config: SpriteAssetConfig): Promise<Texture | null> =>
  new Promise((resolve) => {
    loader.load(
      config.path,
      (tex) => {
        tex.magFilter = LinearFilter
        tex.minFilter = LinearFilter
        tex.wrapS = ClampToEdgeWrapping
        tex.wrapT = ClampToEdgeWrapping
        tex.needsUpdate = true
        resolve(tex)
      },
      undefined,
      () => resolve(null), // 로드 실패 → null (프로시저럴 fallback)
    )
  })

// 로드된 이미지 텍스처만 추적 (dispose용, 프로시저럴 참조 제외)
type LoadedImageTextures = {
  player: Partial<Record<CharacterClass, Texture>>
  entity: Partial<Record<'monster' | 'elite' | 'boss' | 'projectile', Texture>>
}

// 모든 스프라이트 텍스처 로드 (성공한 것만 반환)
const loadAllSpriteTextures = async (): Promise<{
  merged: SpriteTextures
  imageOnly: LoadedImageTextures
}> => {
  const base = getSpriteTextures()
  const imageOnly: LoadedImageTextures = { player: {}, entity: {} }

  // 플레이어 4클래스 병렬 로드
  const classKeys = Object.keys(PLAYER_SPRITE_ASSETS) as CharacterClass[]
  const playerResults = await Promise.all(
    classKeys.map((cls) => loadSpriteTexture(PLAYER_SPRITE_ASSETS[cls]))
  )

  const playerMap = { ...base.player }
  classKeys.forEach((cls, i) => {
    const tex = playerResults[i]
    if (tex) {
      playerMap[cls] = tex
      imageOnly.player[cls] = tex
    }
  })

  // 엔티티 (몬스터/엘리트/보스/투사체) 병렬 로드
  const entityKeys = ['monster', 'elite', 'boss', 'projectile'] as const
  const entityResults = await Promise.all(
    entityKeys.map((key) => loadSpriteTexture(ENTITY_SPRITE_ASSETS[key]))
  )

  const entityMap: Record<string, Texture> = {}
  entityKeys.forEach((key, i) => {
    const tex = entityResults[i]
    if (tex) {
      entityMap[key] = tex
      imageOnly.entity[key] = tex
    }
  })

  const merged: SpriteTextures = {
    player: playerMap,
    monster: entityMap.monster ?? base.monster,
    elite: entityMap.elite ?? base.elite,
    boss: entityMap.boss ?? base.boss,
    projectile: entityMap.projectile ?? base.projectile,
  }

  return { merged, imageOnly }
}

// 모듈 레벨 캐시: 여러 컴포넌트에서 호출해도 한 번만 로드
let _loadPromise: Promise<{ merged: SpriteTextures; imageOnly: LoadedImageTextures }> | null = null
const loadAllCached = () => {
  if (!_loadPromise) {
    _loadPromise = loadAllSpriteTextures()
  }
  return _loadPromise
}

// 로드된 이미지 텍스처만 dispose (프로시저럴 텍스처는 건드리지 않음)
const disposeImageTextures = (imageOnly: LoadedImageTextures) => {
  for (const tex of Object.values(imageOnly.player)) {
    tex?.dispose()
  }
  for (const tex of Object.values(imageOnly.entity)) {
    tex?.dispose()
  }
}

// 배경 타일 텍스처 로드 (RepeatWrapping 설정 포함)
export const loadBackgroundTexture = (mapId: MapId): Promise<Texture | null> =>
  new Promise((resolve) => {
    const config = BACKGROUND_ASSETS[mapId]
    loader.load(
      config.path,
      (tex) => {
        tex.wrapS = RepeatWrapping
        tex.wrapT = RepeatWrapping
        tex.magFilter = LinearFilter
        tex.minFilter = LinearFilter
        tex.needsUpdate = true
        resolve(tex)
      },
      undefined,
      () => resolve(null),
    )
  })

// 로드된 텍스처를 제공하는 React hook
// 초기값: 프로시저럴 (즉시 렌더) → 이미지 로드 완료 시 전환
// 모듈 레벨 캐시를 사용하므로 여러 컴포넌트에서 호출해도 1회만 로드
export const useSpriteTextures = (): {
  textures: SpriteTextures
  loaded: boolean
} => {
  const [textures, setTextures] = useState<SpriteTextures>(getSpriteTextures)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadAllCached().then(({ merged }) => {
      if (cancelled) return
      setTextures(merged)
      setLoaded(true)
    }).catch(() => {
      // 전체 실패 시 프로시저럴 유지
    })

    return () => { cancelled = true }
  }, [])

  return { textures, loaded }
}

// NPC 텍스처 로드 (타입별 캐시)
const _npcCache: Partial<Record<NpcType, Texture | null>> = {}

export const loadNpcTexture = (npcType: NpcType): Promise<Texture | null> => {
  if (npcType in _npcCache) return Promise.resolve(_npcCache[npcType] ?? null)
  const config = NPC_SPRITE_ASSETS[npcType]
  return loadSpriteTexture(config).then((tex) => {
    _npcCache[npcType] = tex
    return tex
  })
}

export const disposeNpcTextures = () => {
  for (const tex of Object.values(_npcCache)) tex?.dispose()
  for (const key of Object.keys(_npcCache)) delete _npcCache[key as NpcType]
}

// NPC 텍스처 React hook (전체 NPC 타입 병렬 로드)
export const useNpcTextures = (): {
  textures: Partial<Record<NpcType, Texture>>
  loaded: boolean
} => {
  const [textures, setTextures] = useState<Partial<Record<NpcType, Texture>>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const npcTypes = Object.keys(NPC_SPRITE_ASSETS) as NpcType[]

    Promise.all(npcTypes.map((t) => loadNpcTexture(t))).then((results) => {
      if (cancelled) return
      const map: Partial<Record<NpcType, Texture>> = {}
      npcTypes.forEach((t, i) => {
        const tex = results[i]
        if (tex) map[t] = tex
      })
      setTextures(map)
      setLoaded(true)
    }).catch(() => { /* fallback: 프로시저럴 유지 */ })

    return () => { cancelled = true }
  }, [])

  return { textures, loaded }
}

// 장애물 텍스처 로드 (spriteType 키 기반 캐시)
const _obstacleCache: Partial<Record<string, Texture | null>> = {}

export const loadObstacleTexture = (spriteType: string): Promise<Texture | null> => {
  if (spriteType in _obstacleCache) return Promise.resolve(_obstacleCache[spriteType] ?? null)
  const config = OBSTACLE_SPRITE_ASSETS[spriteType]
  if (!config) return Promise.resolve(null)
  return loadSpriteTexture(config).then((tex) => {
    _obstacleCache[spriteType] = tex
    return tex
  })
}

export const disposeObstacleTextures = () => {
  for (const tex of Object.values(_obstacleCache)) tex?.dispose()
  for (const key of Object.keys(_obstacleCache)) delete _obstacleCache[key]
}

// 장애물 텍스처 React hook (사용중인 spriteType들만 로드)
export const useObstacleTextures = (spriteTypes: readonly string[]): {
  textures: Record<string, Texture>
  loaded: boolean
} => {
  const [textures, setTextures] = useState<Record<string, Texture>>({})
  const [loaded, setLoaded] = useState(false)

  const cacheKey = [...new Set(spriteTypes.filter(Boolean))].join(',')

  useEffect(() => {
    const types = cacheKey ? cacheKey.split(',') : []
    if (types.length === 0) {
      setLoaded(true)
      return
    }

    let cancelled = false

    Promise.all(types.map((t) => loadObstacleTexture(t))).then((results) => {
      if (cancelled) return
      const map: Record<string, Texture> = {}
      types.forEach((t, i) => {
        const tex = results[i]
        if (tex) map[t] = tex
      })
      setTextures(map)
      setLoaded(true)
    }).catch(() => { /* fallback: 프로시저럴 유지 */ })

    return () => { cancelled = true }
  }, [cacheKey])

  return { textures, loaded }
}
