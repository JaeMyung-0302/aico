"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useWorldStore } from "@/stores/world-store";

const BODY_COLOR = "#646cff";
const HEAD_COLOR = "#e0e0e0";

export const CharacterModel = () => {
  const cameraMode = useWorldStore((s) => s.cameraMode);
  const groupRef = useRef<THREE.Group>(null);
  const targetQuaternion = useRef(new THREE.Quaternion());
  const _moveDir = useRef(new THREE.Vector3());

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const pos = useWorldStore.getState().playerPosition;
    group.position.set(pos[0], pos[1] - 0.3, pos[2]);

    const vel = _moveDir.current;
    vel.set(pos[0] - group.userData.prevX, 0, pos[2] - group.userData.prevZ);
    group.userData.prevX = pos[0];
    group.userData.prevZ = pos[2];

    if (vel.lengthSq() > 0.001) {
      const angle = Math.atan2(vel.x, vel.z);
      targetQuaternion.current.setFromAxisAngle(
        THREE.Object3D.DEFAULT_UP,
        angle,
      );
    }

    group.quaternion.slerp(targetQuaternion.current, 0.15);
  });

  if (cameraMode !== "third-person") return null;

  return (
    <group
      ref={groupRef}
      userData={{ prevX: 0, prevZ: 0, isPlayer: true }}
    >
      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.5, 4, 8]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={HEAD_COLOR} />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.08, 1.15, 0.15]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[-0.08, 1.15, 0.15]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </group>
  );
};
