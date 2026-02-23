/**
 * 3D 카메라 리그
 * PerspectiveCamera + 3인칭 팔로우
 *
 * 좌표계: 게임 XY → Three.js XZ (Y=높이)
 * 카메라: 플레이어 상방 + 후방에서 내려다봄
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import {
  CAMERA_LERP,
  CAMERA_DEADZONE_X,
  CAMERA_DEADZONE_Y,
} from '@soulblade/shared'
import type { MapId } from '@soulblade/shared'
import { clamp } from '../physics/aabb'
import { useEntityStore } from '../stores/useEntityStore'
import { MAP_CONFIGS } from '../data/maps'
import { gameToWorld } from './coord-adapter'

// 3인칭 카메라 오프셋
const CAM_HEIGHT = 300
const CAM_BACK = 350

interface CameraRigProps {
  mapId: MapId
}

export const CameraRig = ({ mapId }: CameraRigProps) => {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useEffect(() => {
    camera.updateProjectionMatrix()
  }, [size, camera])

  useFrame(() => {
    const player = useEntityStore.getState().player
    if (!player || !player.active) return

    const [targetX, , targetZ] = gameToWorld(player.body.x, player.body.y)

    // 데드존 (XZ 평면)
    const halfDzX = CAMERA_DEADZONE_X / 2
    const halfDzZ = CAMERA_DEADZONE_Y / 2

    // 카메라가 바라보는 지면 포인트
    const lookX = camera.position.x
    const lookZ = camera.position.z - CAM_BACK

    let desiredX = lookX
    let desiredZ = lookZ

    if (targetX > lookX + halfDzX) desiredX = targetX - halfDzX
    else if (targetX < lookX - halfDzX) desiredX = targetX + halfDzX

    if (targetZ > lookZ + halfDzZ) desiredZ = targetZ - halfDzZ
    else if (targetZ < lookZ - halfDzZ) desiredZ = targetZ + halfDzZ

    // LERP
    const newX = lookX + (desiredX - lookX) * CAMERA_LERP
    const newZ = lookZ + (desiredZ - lookZ) * CAMERA_LERP

    // 맵 바운드 클램프
    const mapConfig = MAP_CONFIGS[mapId]
    const mapW = mapConfig.worldSize.width
    const mapH = mapConfig.worldSize.height

    const clampedX = clamp(newX, 0, mapW)
    const clampedZ = clamp(newZ, 0, mapH)

    // 카메라 위치 + lookAt
    camera.position.set(clampedX, CAM_HEIGHT, clampedZ + CAM_BACK)
    camera.lookAt(clampedX, 0, clampedZ)
  })

  return null
}
