"use client";

import { useCallback, useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useWorldStore } from "@/stores/world-store";
import type { CollectibleMeta } from "@/types";

import { InteractionZone } from "./interaction-zone";

interface CollectibleItemProps {
  readonly item: CollectibleMeta;
}

const COLLECT_RADIUS = 1.5;

export const CollectibleItem = ({ item }: CollectibleItemProps) => {
  const collectedItems = useWorldStore((s) => s.collectedItems);
  const collectItem = useWorldStore((s) => s.collectItem);
  const meshRef = useRef<THREE.Mesh>(null);
  const [isNearby, setIsNearby] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const scaleRef = useRef(1);

  const isCollected = collectedItems.has(item.id);

  const onCollect = useCallback(() => {
    if (isCollected || collecting) return;
    setCollecting(true);
    collectItem(item.id);
  }, [isCollected, collecting, collectItem, item.id]);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current || isCollected) return;

    if (collecting) {
      scaleRef.current = Math.max(0, scaleRef.current - delta * 4);
      meshRef.current.scale.setScalar(scaleRef.current);
      return;
    }

    meshRef.current.position.y =
      item.position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    meshRef.current.rotation.y += delta * 0.5;

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = isNearby
      ? 0.6 + Math.sin(clock.getElapsedTime() * 4) * 0.2
      : 0.3;
  });

  if (isCollected) return null;
  if (collecting && scaleRef.current <= 0) return null;

  const [x, y, z] = item.position;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[x, y, z]}
        onClick={onCollect}
      >
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive={new THREE.Color("#fbbf24")}
          emissiveIntensity={0.3}
        />
      </mesh>

      <InteractionZone
        targetPosition={item.position}
        radius={COLLECT_RADIUS}
        onEnter={() => setIsNearby(true)}
        onExit={() => setIsNearby(false)}
      />
    </group>
  );
};
