"use client";

import { useRef } from "react";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useWorldStore } from "@/stores/world-store";
import { tourStops } from "@/content/tour-stops";

const THIRD_PERSON_OFFSET = new THREE.Vector3(0, 3, -5);
const LERP_FACTOR = 0.08;
const TOUR_LERP_FACTOR = 0.03;

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

const TourCamera = () => {
  const { camera } = useThree();
  const _target = useRef(new THREE.Vector3());
  const _lookAt = useRef(new THREE.Vector3());
  const _currentLookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    const { tourStopIndex } = useWorldStore.getState();
    const stop = tourStops[tourStopIndex];
    if (!stop) return;

    _target.current.set(stop.position[0], stop.position[1], stop.position[2]);
    _lookAt.current.set(stop.lookAt[0], stop.lookAt[1], stop.lookAt[2]);

    camera.position.lerp(_target.current, TOUR_LERP_FACTOR);
    camera.getWorldDirection(_currentLookAt.current);
    _currentLookAt.current.add(camera.position);
    _currentLookAt.current.lerp(_lookAt.current, TOUR_LERP_FACTOR);
    camera.lookAt(_currentLookAt.current);
  });

  return null;
};

export const CameraController = () => {
  const cameraMode = useWorldStore((s) => s.cameraMode);

  if (cameraMode === "tour") {
    return <TourCamera />;
  }

  if (cameraMode === "third-person") {
    return <ThirdPersonCamera />;
  }

  return <PointerLockControls />;
};
