"use client";

import { useMemo } from "react";

import { SpriteText } from "../objects/sprite-text";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Color, DoubleSide } from "three";

import { getCollectiblesByWorld } from "@/content/collectibles";

import { CollectibleItem } from "../objects/collectible-item";
import { Portal } from "./portal";

const hubCollectibles = getCollectiblesByWorld("hub");

const GROUND_SIZE = 50;
const WALL_HEIGHT = 5;
const WALL_THICKNESS = 0.5;
const HALF = GROUND_SIZE / 2;

const TreeGroup = () => {
  const trees = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: `tree-${i}`,
        x: Math.cos((i / 12) * Math.PI * 2) * 15 + (Math.random() - 0.5) * 6,
        z: Math.sin((i / 12) * Math.PI * 2) * 15 + (Math.random() - 0.5) * 6,
        scale: 0.8 + Math.random() * 0.4,
      })),
    [],
  );

  return (
    <>
      {trees.map((tree) => (
        <group key={tree.id} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 2, 6]} />
            <meshStandardMaterial color="#5c3d2e" />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[0.8 * tree.scale, 2 * tree.scale, 6]} />
            <meshStandardMaterial color="#2d5a27" />
          </mesh>
        </group>
      ))}
    </>
  );
};

const RockGroup = () => {
  const rocks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: `rock-${i}`,
        x: Math.cos((i / 8) * Math.PI * 2) * 20 + (Math.random() - 0.5) * 4,
        z: Math.sin((i / 8) * Math.PI * 2) * 20 + (Math.random() - 0.5) * 4,
        scale: 0.3 + Math.random() * 0.5,
      })),
    [],
  );

  return (
    <>
      {rocks.map((rock) => (
        <mesh key={rock.id} position={[rock.x, rock.scale * 0.4, rock.z]} castShadow>
          <dodecahedronGeometry args={[rock.scale, 0]} />
          <meshStandardMaterial color="#6b6b6b" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
};

export const HubWorld = () => (
  <>
    {/* Sky gradient via hemisphere light + fog (lighter alternative to drei Sky shader) */}
    <hemisphereLight args={["#87ceeb", "#4a6741", 0.6]} />

    {/* Ground */}
    <RigidBody type="fixed" friction={1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#4a6741" roughness={0.8} />
      </mesh>
    </RigidBody>

    {/* Boundary Walls (invisible) */}
    <RigidBody type="fixed">
      <CuboidCollider position={[0, WALL_HEIGHT / 2, -HALF]} args={[HALF, WALL_HEIGHT / 2, WALL_THICKNESS / 2]} />
      <CuboidCollider position={[0, WALL_HEIGHT / 2, HALF]} args={[HALF, WALL_HEIGHT / 2, WALL_THICKNESS / 2]} />
      <CuboidCollider position={[-HALF, WALL_HEIGHT / 2, 0]} args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, HALF]} />
      <CuboidCollider position={[HALF, WALL_HEIGHT / 2, 0]} args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, HALF]} />
    </RigidBody>

    {/* Spawn visual marker */}
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshStandardMaterial
        color="#646cff"
        emissive={new Color("#646cff")}
        emissiveIntensity={0.5}
        side={DoubleSide}
      />
    </mesh>

    <SpriteText
      position={[0, 2.5, -3]}
      fontSize={0.5}
      color="#e0e0e0"
      anchorX="center"
      anchorY="middle"
    >
      기술의 섬
    </SpriteText>

    {/* Welcome text near spawn */}
    <SpriteText
      position={[0, 1.5, 2]}
      fontSize={0.2}
      color="#a0a0a0"
      anchorX="center"
      anchorY="middle"
    >
      환영합니다! WASD로 이동하세요
    </SpriteText>

    <TreeGroup />
    <RockGroup />

    {/* Collectibles */}
    {hubCollectibles.map((item) => (
      <CollectibleItem key={item.id} item={item} />
    ))}

    {/* Portals */}
    <Portal position={[10, 0, 0]} destination="projects" />
    <Portal position={[-10, 0, 0]} destination="lab" />
  </>
);
