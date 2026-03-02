"use client";

import { Suspense, useEffect, useRef } from "react";

import { useWorldStore } from "@/stores/world-store";
import { worldConfigs } from "@/content/worlds";

import { HubWorld } from "./hub-world";
import { LabWorld } from "./lab-world";
import { ProjectsWorld } from "./projects-world";

const useResetPositionOnWorldChange = () => {
  const currentWorld = useWorldStore((s) => s.currentWorld);
  const setPlayerPosition = useWorldStore((s) => s.setPlayerPosition);
  const prevWorld = useRef(currentWorld);

  useEffect(() => {
    if (prevWorld.current !== currentWorld) {
      const config = worldConfigs.get(currentWorld);
      if (config) {
        setPlayerPosition(config.spawnPosition);
      }
      prevWorld.current = currentWorld;
    }
  }, [currentWorld, setPlayerPosition]);
};

export const WorldRenderer = () => {
  const currentWorld = useWorldStore((s) => s.currentWorld);
  useResetPositionOnWorldChange();

  return (
    <Suspense fallback={null}>
      {currentWorld === "hub" && <HubWorld />}
      {currentWorld === "projects" && <ProjectsWorld />}
      {currentWorld === "lab" && <LabWorld />}
    </Suspense>
  );
};
