/**
 * 스프라이트 에셋 로더
 * PNG 이미지를 TextureLoader로 비동기 로드, 실패 시 프로시저럴 fallback
 *
 * 사용법:
 *   const { textures } = useSpriteTextures()
 *   // textures.player.Warrior → 이미지 텍스처 또는 프로시저럴 CanvasTexture
 */

import { useState, useEffect } from 'react'
import { TextureLoader, NearestFilter, ClampToEdgeWrapping, RepeatWrapping } from 'three'
import type { Texture } from 'three'
import type { CharacterClass, MapId } from '@soulblade/shared'
import { getSpriteTextures } from './sprite-generator'
import type { SpriteTextures } from './sprite-generator'
import {
  PLAYER_SPRITE_ASSETS,
  ENTITY_SPRITE_ASSETS,
  BACKGROUND_ASSETS,
} from './sprite-config'
import type { SpriteAssetConfig } from './sprite-config'

const loader = new TextureLoader()

// 단일 스프라이트 텍스처 로드 (실패 시 null)
const loadSpriteTexture = (config: SpriteAssetConfig): Promise<Texture | null> =>
  new Promise((resolve) => {
    loader.load(
      config.path,
      (tex) => {
        tex.magFilter = NearestFilter
        tex.minFilter = NearestFilter
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
        tex.magFilter = NearestFilter
        tex.minFilter = NearestFilter
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
