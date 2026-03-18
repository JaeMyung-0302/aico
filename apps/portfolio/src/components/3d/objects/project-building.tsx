"use client";

import { useCallback, useRef } from "react";

import { SpriteText } from "./sprite-text";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";

import { useWorldStore } from "@/stores/world-store";
import type { ProjectPlacement } from "@/types";

import { InteractionZone } from "./interaction-zone";

interface ProjectBuildingProps {
  readonly placement: ProjectPlacement;
  readonly title: string;
}

const TECH_COLORS: Record<string, string> = {
  React: "#61dafb",
  NestJS: "#e0234e",
  "Socket.io": "#010101",
  Prisma: "#2d3748",
  Claude: "#d4a574",
  default: "#646cff",
};

const getColor = (title: string): string => {
  for (const [key, color] of Object.entries(TECH_COLORS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#646cff";
};

const PROXIMITY_RADIUS = 4;

export const ProjectBuilding = ({ placement, title }: ProjectBuildingProps) => {
  const [x, , z] = placement.position;
  const color = getColor(title);
  const setNearbyProject = useWorldStore((s) => s.setNearbyProject);
  const glowRef = useRef<THREE.Mesh>(null);
  const isNearby = useRef(false);

  const onEnter = useCallback(() => {
    isNearby.current = true;
    setNearbyProject(placement.slug);
  }, [placement.slug, setNearbyProject]);

  const onExit = useCallback(() => {
    isNearby.current = false;
    setNearbyProject(null);
  }, [setNearbyProject]);

  useFrame((_, delta) => {
    if (!glowRef.current) return;
    const mat = glowRef.current.material as THREE.MeshStandardMaterial;
    const target = isNearby.current ? 0.6 : 0.15;
    const diff = target - mat.emissiveIntensity;
    if (Math.abs(diff) < 0.005) {
      mat.emissiveIntensity = target;
      return;
    }
    mat.emissiveIntensity += diff * delta * 4;
  });

  return (
    <group position={[x, 0, z]} rotation={[0, placement.rotation, 0]}>
      <RigidBody type="fixed">
        <CuboidCollider args={[1, 1.5, 1]} position={[0, 1.5, 0]} />
      </RigidBody>

      {/* Base */}
      <mesh ref={glowRef} position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={new THREE.Color(color)}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <boxGeometry args={[2.2, 0.3, 2.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Title */}
      <SpriteText
        position={[0, 4, 0]}
        fontSize={0.35}
        color="#e0e0e0"
      >
        {title}
      </SpriteText>

      <InteractionZone
        targetPosition={[x, 0, z]}
        radius={PROXIMITY_RADIUS}
        onEnter={onEnter}
        onExit={onExit}
      />
    </group>
  );
};
