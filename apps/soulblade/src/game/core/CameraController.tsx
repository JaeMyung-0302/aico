/**
 * R3F 카메라 컨트롤러
 * Phaser camera.startFollow + setDeadzone 대체
 *
 * 좌표계: 게임 Y-down → Three.js Y-up 변환 (Y 반전)
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import {
  CAMERA_LERP,
  CAMERA_DEADZONE_X,
  CAMERA_DEADZONE_Y,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
} from '@soulblade/shared'
import type { MapId } from '@soulblade/shared'
import { clamp } from '../physics/aabb'
import { useEntityStore } from '../stores/useEntityStore'
import { MAP_CONFIGS } from '../data/maps'

// 2.5D 카메라 기울기: ~34° (건물 앞면 56% 가시 + 3D 깊이감)
export const CAMERA_TILT = 0.6
// 카메라 Z 높이: 기울기에서 모든 오브젝트가 근평면 앞에 위치하도록
const CAMERA_Z = 400
const TILT_Y_OFFSET = CAMERA_Z * Math.tan(CAMERA_TILT)

// 카메라 Y 반전: 게임 Y-down → Three.js Y-up
const gameToRenderY = (y: number): number => -y

interface CameraControllerProps {
  mapId: MapId
}

export const CameraController = ({ mapId }: CameraControllerProps) => {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  // 리사이즈 시 줌 갱신 (FIT 스케일링)
  useEffect(() => {
    const scaleX = size.width / VIEWPORT_WIDTH
    const scaleY = size.height / VIEWPORT_HEIGHT
    camera.zoom = Math.min(scaleX, scaleY)
    // 2.5D 기울기 적용 (R3F 기본 lookAt(0,0,0) 오버라이드)
    camera.rotation.set(-CAMERA_TILT, 0, 0)
    camera.updateProjectionMatrix()
  }, [size, camera])

  useFrame(() => {
    const player = useEntityStore.getState().player
    if (!player || !player.active) return

    const targetX = player.body.x
    const targetRenderY = gameToRenderY(player.body.y)

    // 데드존 계산: 플레이어가 데드존 밖으로 나가야 카메라 이동
    const halfDzX = CAMERA_DEADZONE_X / 2
    const halfDzY = CAMERA_DEADZONE_Y / 2

    const camX = camera.position.x
    const camY = camera.position.y

    let desiredX = camX
    let desiredY = camY

    // 데드존 밖이면 카메라 목표 갱신
    if (targetX > camX + halfDzX) {
      desiredX = targetX - halfDzX
    } else if (targetX < camX - halfDzX) {
      desiredX = targetX + halfDzX
    }

    if (targetRenderY > camY + halfDzY) {
      desiredY = targetRenderY - halfDzY
    } else if (targetRenderY < camY - halfDzY) {
      desiredY = targetRenderY + halfDzY
    }

    // LERP 스무딩
    const newX = camX + (desiredX - camX) * CAMERA_LERP
    const newY = camY + (desiredY - camY) * CAMERA_LERP

    // 실제 화면에서 보이는 영역 (캔버스 픽셀 / 줌 = 게임 단위)
    const halfViewW = size.width / (2 * camera.zoom)
    const halfViewH = size.height / (2 * camera.zoom)

    // 현재 맵 크기 기반 바운드 클램프
    const mapConfig = MAP_CONFIGS[mapId]
    const mapW = mapConfig.worldSize.width
    const mapH = mapConfig.worldSize.height

    // 맵이 화면보다 작으면 센터 고정, 크면 클램프
    const clampedX = mapW <= halfViewW * 2
      ? mapW / 2
      : clamp(newX, halfViewW, mapW - halfViewW)

    const clampedY = mapH <= halfViewH * 2
      ? -mapH / 2
      : clamp(newY, -mapH + halfViewH, -halfViewH)

    camera.position.x = clampedX
    // 기울기 보정: 카메라를 Y+ 방향으로 이동하여 시점 중심 유지
    camera.position.y = clampedY + TILT_Y_OFFSET
  })

  return null
}
