"use client";

import { SpriteText } from "../objects/sprite-text";
import { CuboidCollider, RigidBody } from "@react-three/rapier";

import { getCollectiblesByWorld } from "@/content/collectibles";
import { projects } from "@/content/projects";
import { getProjectPlacements } from "@/content/worlds";

import { CollectibleItem } from "../objects/collectible-item";
import { ProjectBuilding } from "../objects/project-building";
import { Portal } from "./portal";

const GROUND_SIZE = 40;
const HALF = GROUND_SIZE / 2;
const WALL_HEIGHT = 5;

const labPlacements = getProjectPlacements("lab");
const labCollectibles = getCollectiblesByWorld("lab");
const projectMap = new Map(projects.map((p) => [p.slug, p]));

export const LabWorld = () => (
  <>
    {/* Cool blue lighting */}
    <directionalLight position={[-5, 15, -5]} intensity={0.6} color="#4da6ff" castShadow />
    <pointLight position={[0, 5, 0]} intensity={0.4} color="#8b5cf6" />

    {/* Dark ground */}
    <RigidBody type="fixed" friction={1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
      </mesh>
    </RigidBody>

    {/* Boundary Walls */}
    <RigidBody type="fixed">
      <CuboidCollider position={[0, WALL_HEIGHT / 2, -HALF]} args={[HALF, WALL_HEIGHT / 2, 0.25]} />
      <CuboidCollider position={[0, WALL_HEIGHT / 2, HALF]} args={[HALF, WALL_HEIGHT / 2, 0.25]} />
      <CuboidCollider position={[-HALF, WALL_HEIGHT / 2, 0]} args={[0.25, WALL_HEIGHT / 2, HALF]} />
      <CuboidCollider position={[HALF, WALL_HEIGHT / 2, 0]} args={[0.25, WALL_HEIGHT / 2, HALF]} />
    </RigidBody>

    {/* Title */}
    <SpriteText
      position={[0, 3, -8]}
      fontSize={0.6}
      color="#c4b5fd"
    >
      AI 연구소
    </SpriteText>

    {/* Holographic display pillars */}
    {([[-5, 5], [5, 5], [-5, -5], [5, -5]] as const).map(([x, z], i) => (
      <mesh key={i} position={[x, 2, z]}>
        <cylinderGeometry args={[0.1, 0.1, 4, 8]} />
        <meshStandardMaterial
          color="#4da6ff"
          emissive="#4da6ff"
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
        />
      </mesh>
    ))}

    {/* ContentBot building */}
    {labPlacements.map((placement) => {
      const project = projectMap.get(placement.slug);
      if (!project) return null;
      return (
        <ProjectBuilding
          key={placement.slug}
          placement={placement}
          title={project.title}
        />
      );
    })}

    {/* Collectibles */}
    {labCollectibles.map((item) => (
      <CollectibleItem key={item.id} item={item} />
    ))}

    {/* Portal back to hub */}
    <Portal position={[0, 0, -15]} destination="hub" />
  </>
);
