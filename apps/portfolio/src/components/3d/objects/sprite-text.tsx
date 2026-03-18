"use client";

import { useMemo } from "react";
import { CanvasTexture, LinearFilter, SpriteMaterial } from "three";

interface SpriteTextProps {
  readonly children: string;
  readonly position?: readonly [number, number, number];
  readonly fontSize?: number;
  readonly color?: string;
  readonly anchorX?: "center" | "left" | "right";
  readonly anchorY?: "middle" | "top" | "bottom";
}

const createTextTexture = (
  text: string,
  fontSize: number,
  color: string,
): CanvasTexture => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const scale = 4;
  const font = `${fontSize * scale * 40}px -apple-system, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width) + 20;
  canvas.height = Math.ceil(fontSize * scale * 60);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 10, canvas.height / 2);
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

export const SpriteText = ({
  children,
  position = [0, 0, 0],
  fontSize = 0.5,
  color = "#e0e0e0",
}: SpriteTextProps) => {
  const { texture, aspect } = useMemo(() => {
    const tex = createTextTexture(children, fontSize, color);
    return {
      texture: tex,
      aspect: tex.image.width / tex.image.height,
    };
  }, [children, fontSize, color]);

  const material = useMemo(
    () =>
      new SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      }),
    [texture],
  );

  const scaleY = fontSize * 1.2;
  const scaleX = scaleY * aspect;

  return (
    <sprite
      position={[position[0], position[1], position[2]]}
      material={material}
      scale={[scaleX, scaleY, 1]}
    />
  );
};
