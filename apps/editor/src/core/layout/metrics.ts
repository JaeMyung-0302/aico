/** 텍스트 측정 추상화 — 레이아웃은 TextMeasurer에만 의존한다(테스트에서 가짜 주입 가능). */

import type { RunStyle } from "../model/types";
import { PT_TO_PX } from "./constants";

export type FontMetrics = { ascent: number; descent: number };

export type TextMeasurer = {
  width: (text: string, style: RunStyle) => number;
  metrics: (style: RunStyle) => FontMetrics;
};

export const fontString = (style: RunStyle): string => {
  // 위/아래 첨자는 축소 렌더링
  const scale = style.verticalAlign === "baseline" ? 1 : 0.65;
  return `${style.italic ? "italic " : ""}${style.bold ? "700" : "400"} ${style.fontSize * scale * PT_TO_PX}px ${style.fontFamily}`;
};

/** canvas 2d 기반 측정기. 짧은 토큰은 폭을 캐시한다. */
export const createCanvasMeasurer = (): TextMeasurer => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 만들 수 없습니다");

  const widthCache = new Map<string, Map<string, number>>();
  const metricsCache = new Map<string, FontMetrics>();

  const setFont = (style: RunStyle): string => {
    const font = fontString(style);
    if (ctx.font !== font) ctx.font = font;
    return font;
  };

  return {
    width: (text, style) => {
      const font = setFont(style);
      if (text.length > 32) return ctx.measureText(text).width;
      let byText = widthCache.get(font);
      if (!byText) {
        byText = new Map();
        widthCache.set(font, byText);
      }
      const cached = byText.get(text);
      if (cached !== undefined) return cached;
      const w = ctx.measureText(text).width;
      if (byText.size < 4096) byText.set(text, w);
      return w;
    },
    metrics: (style) => {
      const font = setFont(style);
      const cached = metricsCache.get(font);
      if (cached) return cached;
      const m = ctx.measureText("Mg한글");
      const px = style.fontSize * PT_TO_PX;
      const ascent = m.fontBoundingBoxAscent || px * 0.85;
      const descent = m.fontBoundingBoxDescent || px * 0.25;
      const result = { ascent, descent };
      metricsCache.set(font, result);
      return result;
    },
  };
};
