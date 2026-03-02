"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";

import WorldLoading from "./loading";

const WorldCanvas = dynamic(
  () => import("@/components/3d/world-canvas"),
  { ssr: false, loading: () => <WorldLoading /> },
);

const detectWebGL = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl")
    );
  } catch {
    return false;
  }
};

const WorldPage = () => {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglSupported(detectWebGL());
  }, []);

  if (webglSupported === null) {
    return <WorldLoading />;
  }

  if (!webglSupported) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a",
        color: "#e0e0e0",
        gap: "1rem",
      }}>
        <h1>이 브라우저는 3D를 지원하지 않습니다</h1>
        <p>데스크톱 Chrome에서 최적의 경험을 제공합니다.</p>
        <Link href="/" style={{ color: "#646cff" }}>
          2D 포트폴리오로 돌아가기
        </Link>
      </div>
    );
  }

  return <WorldCanvas />;
};

export default WorldPage;
