/** 문서 위치 ↔ 화면 좌표 변환 (캐럿 배치, 클릭 위치 계산, 상/하 이동) */

import type { DocPosition } from "../model/position";
import { graphemes } from "../model/graphemes";
import type { TextMeasurer } from "./metrics";
import type { DocLayout, PageLine } from "./types";

export type CaretRect = { page: number; x: number; y: number; height: number };

/** 라인 내 오프셋의 x 좌표 (콘텐츠 좌표) */
export const xAtOffset = (
  line: PageLine,
  offset: number,
  measurer: TextMeasurer,
): number => {
  if (line.frags.length === 0) return line.x;
  for (const frag of line.frags) {
    if (offset <= frag.start) return frag.x;
    const fragEnd = frag.start + frag.text.length;
    if (offset < fragEnd) {
      const local = offset - frag.start;
      if (frag.kind === "space")
        return frag.x + (frag.width / frag.text.length) * local;
      return frag.x + measurer.width(frag.text.slice(0, local), frag.style);
    }
  }
  const last = line.frags[line.frags.length - 1];
  return last ? last.x + last.width : line.x;
};

/** pos가 놓일 라인의 layout.all 인덱스. 줄바꿈 지점은 다음 라인 시작을 선호한다 */
export const lineIndexOfPos = (layout: DocLayout, pos: DocPosition): number => {
  let candidate = -1;
  for (let i = 0; i < layout.all.length; i++) {
    const line = layout.all[i];
    if (!line || line.para !== pos.para) continue;
    candidate = i;
    if (pos.offset < line.end || (pos.offset === line.end && line.isLast))
      return i;
  }
  return candidate;
};

export const caretRectOf = (
  layout: DocLayout,
  pos: DocPosition,
  measurer: TextMeasurer,
): CaretRect | null => {
  const idx = lineIndexOfPos(layout, pos);
  if (idx < 0) return null;
  const line = layout.all[idx];
  if (!line) return null;
  return {
    page: line.page,
    x: xAtOffset(line, pos.offset, measurer),
    y: line.y,
    height: line.height,
  };
};

/** 라인 내 x 좌표에 가장 가까운 문자 경계 오프셋 */
export const offsetAtX = (
  line: PageLine,
  x: number,
  measurer: TextMeasurer,
): number => {
  if (line.frags.length === 0) return line.start;
  const first = line.frags[0];
  if (!first || x <= first.x) return line.start;
  for (const frag of line.frags) {
    if (x >= frag.x + frag.width) continue;
    if (frag.kind === "space") {
      const per = frag.width / frag.text.length;
      const idx = Math.round((x - frag.x) / per);
      return frag.start + Math.max(0, Math.min(idx, frag.text.length));
    }
    let acc = 0;
    let offset = frag.start;
    for (const g of graphemes(frag.text)) {
      const gw = measurer.width(g, frag.style);
      if (x < frag.x + acc + gw / 2) return offset;
      acc += gw;
      offset += g.length;
    }
    return offset;
  }
  return line.end;
};

/** 페이지 내 좌표(콘텐츠 기준)에서 문서 위치 계산 */
export const posAtPoint = (
  layout: DocLayout,
  page: number,
  x: number,
  y: number,
  measurer: TextMeasurer,
): DocPosition | null => {
  const lines = layout.pages[page];
  if (!lines || lines.length === 0) return null;
  // 같은 y 대역에 여러 라인이 있으면(표의 나란한 셀) x가 가까운 라인을 고른다
  const inBand = lines.filter((l) => y >= l.y && y < l.y + l.height);
  let line: PageLine | undefined;
  if (inBand.length > 1) {
    const distance = (l: PageLine): number => {
      const last = l.frags[l.frags.length - 1];
      const minX = l.x;
      const maxX = last ? last.x + last.width : l.x;
      if (x < minX) return minX - x;
      if (x > maxX) return x - maxX;
      return 0;
    };
    line = inBand.reduce((best, l) =>
      distance(l) < distance(best) ? l : best,
    );
  } else {
    line =
      inBand[0] ??
      lines.find((l) => y < l.y + l.height) ??
      lines[lines.length - 1];
  }
  if (!line) return null;
  return { para: line.para, offset: offsetAtX(line, x, measurer) };
};

/** 상/하 이동 — 대상 라인 인덱스에서 goal x에 가장 가까운 위치 */
export const posAtLineX = (
  layout: DocLayout,
  lineIndex: number,
  x: number,
  measurer: TextMeasurer,
): DocPosition => {
  const line =
    layout.all[Math.max(0, Math.min(lineIndex, layout.all.length - 1))];
  if (!line) return { para: 0, offset: 0 };
  return { para: line.para, offset: offsetAtX(line, x, measurer) };
};
