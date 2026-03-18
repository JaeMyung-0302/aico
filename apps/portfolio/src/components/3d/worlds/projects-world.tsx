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

const placements = getProjectPlacements("projects");
const projectsCollectibles = getCollectiblesByWorld("projects");

const projectMap = new Map(projects.map((p) => [p.slug, p]));

export const ProjectsWorld = () => (
  <>
    {/* Warm directional light */}
    <directionalLight position={[5, 15, 5]} intensity={0.7} color="#ffd699" castShadow />

    {/* Ground */}
    <RigidBody type="fixed" friction={1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#8b7355" roughness={0.9} />
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
      color="#e0e0e0"
    >
      개발자의 워크샵
    </SpriteText>

    {/* Project Buildings */}
    {placements.map((placement) => {
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
    {projectsCollectibles.map((item) => (
      <CollectibleItem key={item.id} item={item} />
    ))}

    {/* Portal back to hub */}
    <Portal position={[0, 0, -15]} destination="hub" />
  </>
);
