/**
 * 맵 씬 컴포넌트
 * TerrainMesh + BackgroundTile + ObstaclesMesh + PortalMesh + NpcMesh 조합
 *
 * currentMapId를 받아 해당 맵의 지형/장애물/포탈/NPC를 렌더링
 */

import { useMemo } from 'react'
import type { MapId } from '@soulblade/shared'
import { MAP_CONFIGS } from '../data/maps'
import { TerrainMesh } from './TerrainMesh'
import { BackgroundTile } from './BackgroundTile'
import { ObstaclesMesh } from './ObstaclesMesh'
import { PortalMesh } from './PortalMesh'
import { NpcMesh } from './NpcMesh'

interface MapSceneProps {
  mapId: MapId
}

export const MapScene = ({ mapId }: MapSceneProps) => {
  const config = useMemo(() => MAP_CONFIGS[mapId], [mapId])
  const { width, height } = config.worldSize

  return (
    <group>
      {/* 배경 타일 (최하단 레이어) */}
      <BackgroundTile mapId={mapId} worldWidth={width} worldHeight={height} />

      {/* 3D 지형 (높낮이 메시) */}
      <TerrainMesh mapId={mapId} worldWidth={width} worldHeight={height} />

      {/* 장애물 */}
      <ObstaclesMesh obstacles={config.obstacles} />

      {/* 포탈 */}
      <PortalMesh portals={config.portals} />

      {/* NPC */}
      <NpcMesh npcs={config.npcs} />
    </group>
  )
}
