/** canvas 페이지 렌더러 — 텍스트, 선택 영역, IME 조합 밑줄을 그린다. */

import type { DocRange } from "../model/position";
import { normalizeRange } from "../model/position";
import { PAGE_HEIGHT, PAGE_WIDTH, PT_TO_PX } from "../layout/constants";
import { fontString, type TextMeasurer } from "../layout/metrics";
import { xAtOffset } from "../layout/hit-test";
import type { DocLayout } from "../layout/types";

export type OverlayRect = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 문단 끝 줄바꿈 기호 선택 표시 폭 */
const NEWLINE_MARK_WIDTH = 7;

/** 범위가 차지하는 라인별 사각형 (선택 하이라이트/조합 밑줄 공용) */
export const rangeRects = (
  layout: DocLayout,
  range: DocRange,
  measurer: TextMeasurer,
): OverlayRect[] => {
  const { start, end } = normalizeRange(range);
  const rects: OverlayRect[] = [];
  for (const line of layout.all) {
    if (line.para < start.para || line.para > end.para) continue;
    const s =
      line.para === start.para
        ? Math.max(start.offset, line.start)
        : line.start;
    const e =
      line.para === end.para ? Math.min(end.offset, line.end) : line.end;
    const includesNewline = line.isLast && line.para < end.para;
    if (s > e || (s === e && !includesNewline)) continue;
    const x1 = xAtOffset(line, s, measurer);
    const x2 = xAtOffset(line, e, measurer);
    const width = Math.max(
      x2 - x1 + (includesNewline ? NEWLINE_MARK_WIDTH : 0),
      2,
    );
    rects.push({
      page: line.page,
      x: x1,
      y: line.y,
      width,
      height: line.height,
    });
  }
  return rects;
};

export type RenderOptions = {
  dpr: number;
  zoom: number;
  selection: OverlayRect[];
  composition: OverlayRect[];
  /** 편집 기호(¶) 표시 */
  showMarks: boolean;
};

export const renderPage = (
  canvas: HTMLCanvasElement,
  layout: DocLayout,
  page: number,
  opts: RenderOptions,
): void => {
  const M = layout.margin;
  const scale = opts.dpr * opts.zoom;
  const w = Math.round(PAGE_WIDTH * scale);
  const h = Math.round(PAGE_HEIGHT * scale);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  // 단락 음영 (맨 뒤)
  for (const s of layout.shadings) {
    if (s.page !== page) continue;
    ctx.fillStyle = s.color;
    ctx.fillRect(M.left + s.x, M.top + s.y, s.width, s.height);
  }

  // 선택 하이라이트 (텍스트 뒤)
  ctx.fillStyle = "rgba(74, 129, 214, 0.3)";
  for (const r of opts.selection) {
    if (r.page !== page) continue;
    ctx.fillRect(M.left + r.x, M.top + r.y, r.width, r.height);
  }

  // 표 셀 테두리
  ctx.strokeStyle = "#6b6f76";
  ctx.lineWidth = 1;
  for (const b of layout.borders) {
    if (b.page !== page) continue;
    ctx.strokeRect(M.left + b.x + 0.5, M.top + b.y + 0.5, b.width, b.height);
  }

  // 단락 테두리 (면별)
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 1;
  for (const b of layout.boxes) {
    if (b.page !== page) continue;
    const x1 = M.left + b.x + 0.5;
    const y1 = M.top + b.y + 0.5;
    const x2 = x1 + b.width;
    const y2 = y1 + b.height;
    ctx.beginPath();
    if (b.sides.top) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);
    }
    if (b.sides.bottom) {
      ctx.moveTo(x1, y2);
      ctx.lineTo(x2, y2);
    }
    if (b.sides.left) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1, y2);
    }
    if (b.sides.right) {
      ctx.moveTo(x2, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  ctx.textBaseline = "alphabetic";
  for (const line of layout.pages[page] ?? []) {
    const baselineY = M.top + line.y + line.baseline;
    // 형광펜 배경 (텍스트 뒤)
    for (const frag of line.frags) {
      if (!frag.style.highlight) continue;
      ctx.fillStyle = frag.style.highlight;
      ctx.fillRect(M.left + frag.x, M.top + line.y, frag.width, line.height);
    }
    // 리스트 마커
    if (line.marker) {
      ctx.font = fontString(line.marker.style);
      ctx.fillStyle = line.marker.style.color;
      ctx.fillText(line.marker.text, M.left + line.marker.x, baselineY);
    }
    for (const frag of line.frags) {
      const px = frag.style.fontSize * PT_TO_PX;
      // 위/아래 첨자 베이스라인 이동
      const shift =
        frag.style.verticalAlign === "super"
          ? -px * 0.35
          : frag.style.verticalAlign === "sub"
            ? px * 0.15
            : 0;
      if (frag.kind !== "space") {
        ctx.font = fontString(frag.style);
        ctx.fillStyle = frag.style.color;
        ctx.fillText(frag.text, M.left + frag.x, baselineY + shift);
      }
      if (frag.style.underline || frag.style.strike) {
        ctx.strokeStyle = frag.style.color;
        ctx.lineWidth = Math.max(1, px / 16);
        const x1 = M.left + frag.x;
        const x2 = x1 + frag.width;
        if (frag.style.underline) {
          const uy = baselineY + Math.max(2, px * 0.11);
          const us = frag.style.underlineStyle ?? "single";
          if (us === "thick") ctx.lineWidth = Math.max(2, px / 8);
          if (us === "dotted") ctx.setLineDash([1.5, 2]);
          else if (us === "dash") ctx.setLineDash([6, 3]);
          else if (us === "dotDash") ctx.setLineDash([6, 3, 1.5, 3]);
          else if (us === "dotDotDash") ctx.setLineDash([6, 3, 1.5, 3, 1.5, 3]);
          ctx.beginPath();
          if (us === "wave") {
            // 물결 밑줄 — 4px 주기 지그재그
            let wx = x1;
            let up = true;
            ctx.moveTo(wx, uy);
            while (wx < x2) {
              wx = Math.min(wx + 3, x2);
              ctx.lineTo(wx, uy + (up ? -1.6 : 1.6));
              up = !up;
            }
          } else {
            ctx.moveTo(x1, uy);
            ctx.lineTo(x2, uy);
            if (us === "double") {
              ctx.moveTo(x1, uy + 2.5);
              ctx.lineTo(x2, uy + 2.5);
            }
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (frag.style.strike) {
          const sy = baselineY - px * 0.28;
          ctx.beginPath();
          ctx.moveTo(x1, sy);
          ctx.lineTo(x2, sy);
          ctx.stroke();
        }
      }
    }
    // 편집 기호 표시 — 문단 끝 ¶
    if (opts.showMarks && line.isLast) {
      const last = line.frags[line.frags.length - 1];
      const endX = last ? last.x + last.width : line.x;
      ctx.font = "400 11px system-ui";
      ctx.fillStyle = "#8aa4d6";
      ctx.fillText("¶", M.left + endX + 1, baselineY);
    }
  }

  // IME 조합 중 텍스트 밑줄
  ctx.strokeStyle = "#4a81d6";
  ctx.lineWidth = 1.5;
  for (const r of opts.composition) {
    if (r.page !== page) continue;
    const y = M.top + r.y + r.height - 2;
    ctx.beginPath();
    ctx.moveTo(M.left + r.x, y);
    ctx.lineTo(M.left + r.x + r.width, y);
    ctx.stroke();
  }
};
