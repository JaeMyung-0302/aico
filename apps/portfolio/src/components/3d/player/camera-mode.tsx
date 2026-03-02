"use client";

import { useRef } from "react";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useWorldStore } from "@/stores/world-store";

const THIRD_PERSON_OFFSET = new THREE.Vector3(0, 3, -5);
const LERP_FACTOR = 0.08;

const ThirdPersonCamera = () => {
  const { camera, scene } = useThree();
  const _target = useRef(new THREE.Vector3());
  const _desired = useRef(new THREE.Vector3());
  const _direction = useRef(new THREE.Vector3());
  const _safePos = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());

  useFrame(() => {
    const pos = useWorldStore.getState().playerPosition;
    const target = _target.current.set(pos[0], pos[1] + 1, pos[2]);
    _desired.current.copy(target).add(THIRD_PERSON_OFFSET);

    // Wall clipping prevention via raycast
    const dir = _direction.current
      .copy(_desired.current)
      .sub(target)
      .normalize();
    const maxDist = THIRD_PERSON_OFFSET.length();

    raycaster.current.set(target, dir);
    raycaster.current.far = maxDist;
    const hits = raycaster.current.intersectObjects(scene.children, true);

    // Filter out player character mesh
    const firstHit = hits.find(
      (h) => !h.object.userData.isPlayer && !h.object.parent?.userData.isPlayer,
    );
    const safeDist =
      firstHit ? Math.max(firstHit.distance - 0.3, 0.5) : maxDist;

    const safePos = _safePos.current
      .copy(target)
      .addScaledVector(dir, safeDist);

    camera.position.lerp(safePos, LERP_FACTOR);
    camera.lookAt(pos[0], pos[1] + 1, pos[2]);
  });

  return null;
};

export const CameraController = () => {
  const cameraMode = useWorldStore((s) => s.cameraMode);

  if (cameraMode === "third-person") {
    return <ThirdPersonCamera />;
  }

  return <PointerLockControls />;
};
