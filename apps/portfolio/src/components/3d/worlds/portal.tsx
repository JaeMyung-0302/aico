"use client";

import { useCallback, useRef } from "react";

import { SpriteText } from "../objects/sprite-text";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useWorldStore } from "@/stores/world-store";
import { worldConfigs } from "@/content/worlds";
import type { Vec3, WorldId } from "@/types";

import { InteractionZone } from "../objects/interaction-zone";

interface PortalProps {
  readonly position: Vec3;
  readonly destination: WorldId;
}

const PORTAL_RADIUS = 1.5;
const ENTER_RADIUS = 1.0;

export const Portal = ({ position, destination }: PortalProps) => {
  const [x, , z] = position;
  const torusRef = useRef<THREE.Mesh>(null);
  const setCurrentWorld = useWorldStore((s) => s.setCurrentWorld);
  const setIsTransitioning = useWorldStore((s) => s.setIsTransitioning);

  const destConfig = worldConfigs.get(destination);
  const label = destConfig?.name ?? destination;

  useFrame(({ clock }) => {
    if (!torusRef.current) return;
    torusRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    const mat = torusRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
  });

  const onEnterPortal = useCallback(() => {
    const state = useWorldStore.getState();
    if (state.isTransitioning) return;
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentWorld(destination);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    }, 600);
  }, [destination, setCurrentWorld, setIsTransitioning]);

  return (
    <group position={[x, 0, z]}>
      <mesh ref={torusRef} position={[0, 2, 0]}>
        <torusGeometry args={[PORTAL_RADIUS, 0.15, 16, 32]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive={new THREE.Color("#8b5cf6")}
          emissiveIntensity={0.3}
        />
      </mesh>

      <SpriteText
        position={[0, 4, 0]}
        fontSize={0.4}
        color="#c4b5fd"
      >
        {label}
      </SpriteText>

      <InteractionZone
        targetPosition={[x, 0, z]}
        radius={ENTER_RADIUS}
        onEnter={onEnterPortal}
        onExit={() => {}}
      />
    </group>
  );
};
