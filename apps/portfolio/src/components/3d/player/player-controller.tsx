"use client";

import { useEffect, useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

import { useWorldStore } from "@/stores/world-store";

const MOVE_SPEED = 5;
const SPRINT_SPEED = 8;
const JUMP_IMPULSE = 4;

const keysPressed = new Set<string>();

export const PlayerController = () => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const setPlayerPosition = useWorldStore((s) => s.setPlayerPosition);

  const _forward = useRef(new THREE.Vector3());
  const _right = useRef(new THREE.Vector3());
  const _direction = useRef(new THREE.Vector3());
  const _scratch = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };
    const onVisibilityChange = () => {
      if (document.hidden) keysPressed.clear();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      keysPressed.clear();
    };
  }, []);

  useFrame(() => {
    const body = rigidBodyRef.current;
    if (!body) return;

    const sprint = keysPressed.has("ShiftLeft") || keysPressed.has("ShiftRight");
    const speed = sprint ? SPRINT_SPEED : MOVE_SPEED;

    const forward = _forward.current;
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = _right.current;
    right.crossVectors(forward, camera.up).normalize();

    const direction = _direction.current.set(0, 0, 0);

    const mobileInput = useWorldStore.getState().mobileInput;
    if (mobileInput) {
      direction.add(
        _scratch.current.copy(forward).multiplyScalar(-mobileInput.moveY),
      );
      direction.add(
        _scratch.current.copy(right).multiplyScalar(mobileInput.moveX),
      );
    }

    if (keysPressed.has("KeyW")) direction.add(forward);
    if (keysPressed.has("KeyS")) direction.sub(forward);
    if (keysPressed.has("KeyD")) direction.add(right);
    if (keysPressed.has("KeyA")) direction.sub(right);

    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    const currentVel = body.linvel();
    body.setLinvel(
      { x: direction.x * speed, y: currentVel.y, z: direction.z * speed },
      true,
    );

    if (keysPressed.has("Space")) {
      const pos = body.translation();
      if (pos.y < 1.5) {
        body.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
      }
    }

    const pos = body.translation();
    const cameraMode = useWorldStore.getState().cameraMode;
    if (cameraMode === "first-person") {
      camera.position.set(pos.x, pos.y + 0.5, pos.z);
    }
    setPlayerPosition([pos.x, pos.y, pos.z]);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={[0, 2, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={4}
    >
      <CapsuleCollider args={[0.5, 0.3]} />
    </RigidBody>
  );
};
