"use client";

import { Component, Suspense } from "react";
import type { ErrorInfo, ReactNode } from "react";

import Link from "next/link";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

import { profile } from "@/content/profile";
import { useWorldStore } from "@/stores/world-store";

import { AdaptiveQuality } from "./adaptive-quality";
import { CameraToggle } from "./hud/camera-toggle";
import { ChatOverlay } from "./hud/chat-overlay";
import { CollectNotification } from "./hud/collect-notification";
import { ControlsGuide } from "./hud/controls-guide";
import { Inventory } from "./hud/inventory";
import { MobileControls } from "./hud/mobile-controls";
import { OnboardingOverlay } from "./hud/onboarding-overlay";
import { ProjectDetail } from "./hud/project-detail";
import { QuickNav } from "./hud/quick-nav";
import { TourControls } from "./hud/tour-controls";
import { CameraController } from "./player/camera-mode";
import { CharacterModel } from "./player/character-model";
import { PlayerController } from "./player/player-controller";
import { WorldRenderer } from "./worlds";
import { TransitionOverlay } from "./worlds/transition-overlay";

const fallbackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  background: "#0a0a0a",
  color: "#e0e0e0",
  gap: "1rem",
};

class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("3D Canvas error:", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={fallbackStyle}>
          <h1>3D 렌더링 중 오류가 발생했습니다</h1>
          <p>페이지를 새로고침하거나 2D 포트폴리오를 이용해주세요.</p>
          <Link href="/" style={{ color: "#646cff" }}>
            2D 포트폴리오로 돌아가기
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

const FallbackBanner = () => {
  const suggestFallback = useWorldStore((s) => s.suggestFallback);

  if (!suggestFallback) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 0, 0, 0.85)",
        color: "#e0e0e0",
        padding: "0.75rem 1.25rem",
        borderRadius: "0.5rem",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "0.875rem",
      }}
    >
      <span>성능이 낮습니다.</span>
      <Link
        href="/"
        style={{ color: "#646cff", fontWeight: 600, textDecoration: "none" }}
      >
        2D 포트폴리오로 돌아가기
      </Link>
    </div>
  );
};

const WorldCanvas = () => {
  const tourActive = useWorldStore((s) => s.tourActive);

  return (
    <CanvasErrorBoundary>
      <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a" }}>
        <Canvas
          camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 1, 0] }}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
            <fog attach="fog" args={["#0a0a0a", 30, 80]} />

            <CameraController />
            <Physics gravity={[0, -9.81, 0]}>
              <AdaptiveQuality />
              <PlayerController />
              <CharacterModel />
              <WorldRenderer />
            </Physics>
          </Suspense>
        </Canvas>

        <TransitionOverlay />
        <ProjectDetail />
        <ChatOverlay />
        <Inventory />
        <CollectNotification />
        {!tourActive && <CameraToggle />}
        <OnboardingOverlay />
        <TourControls />
        <QuickNav />
        {!tourActive && (
          <a
            href={profile.contact.github}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "fixed",
              bottom: "1rem",
              right: "1rem",
              zIndex: 100,
              padding: "0.5rem 1rem",
              background: "rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.5rem",
              color: "#a0a8ff",
              fontSize: "0.8125rem",
              textDecoration: "none",
            }}
          >
            GitHub
          </a>
        )}
        <FallbackBanner />
        {!tourActive && <ControlsGuide />}
        {!tourActive && <MobileControls />}
      </div>
    </CanvasErrorBoundary>
  );
};

export default WorldCanvas;
