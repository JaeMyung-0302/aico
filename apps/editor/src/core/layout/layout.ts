/**
 * 조판 엔진 — 문단을 라인으로(그리디 줄바꿈), 라인을 페이지로(페이지네이션) 배치한다.
 * 라틴은 단어 단위, CJK는 글자 단위로 줄바꿈하고, 줄 끝 공백은 Word처럼 여백에 걸친다.
 * 들여쓰기(indentLeft/indentFirstLine)와 표 셀 그리드 배치를 지원한다.
 */

import type { Paragraph, Run, RunStyle } from "../model/types";
import { paraLength } from "../model/document";
import { graphemes } from "../model/graphemes";
import type { DocModel } from "../model/types";
import { MARGIN, PAGE_HEIGHT, PAGE_WIDTH, PT_TO_PX } from "./constants";
import type { TextMeasurer } from "./metrics";
import type {
  CellBorderRect,
  DocLayout,
  FragKind,
  Line,
  LineFrag,
  PageLine,
} from "./types";

type Token = { text: string; style: RunStyle; start: number; kind: FragKind };

const SPACE_RE = /[ \t\u00a0]/;
const CJK_RE = /[ᄀ-ᇿ⺀-〿㄰-㆏㇀-鿿ꥠ-꥿가-퟿豈-﫿＀-￯]/;

/** 셀 안쪽 여백 (px) */
const CELL_PAD_X = 6;
const CELL_PAD_Y = 3;

const tokenizeRun = (run: Run, base: number): Token[] => {
  const tokens: Token[] = [];
  const text = run.text;
  let i = 0;
  while (i < text.length) {
    if (SPACE_RE.test(text.charAt(i))) {
      let j = i + 1;
      while (j < text.length && SPACE_RE.test(text.charAt(j))) j++;
      tokens.push({
        text: text.slice(i, j),
        style: run.style,
        start: base + i,
        kind: "space",
      });
      i = j;
    } else if (CJK_RE.test(text.charAt(i))) {
      // CJK는 글자 단위로 줄바꿈 가능
      const cp = text.codePointAt(i) ?? 0;
      const len = cp > 0xffff ? 2 : 1;
      tokens.push({
        text: text.slice(i, i + len),
        style: run.style,
        start: base + i,
        kind: "cjk",
      });
      i += len;
    } else {
      let j = i + 1;
      while (
        j < text.length &&
        !SPACE_RE.test(text.charAt(j)) &&
        !CJK_RE.test(text.charAt(j))
      )
        j++;
      tokens.push({
        text: text.slice(i, j),
        style: run.style,
        start: base + i,
        kind: "word",
      });
      i = j;
    }
  }
  return tokens;
};

const tokenizeParagraph = (para: Paragraph): Token[] => {
  const tokens: Token[] = [];
  let base = 0;
  for (const run of para.runs) {
    tokens.push(...tokenizeRun(run, base));
    base += run.text.length;
  }
  return tokens;
};

/** 정렬/양쪽 맞춤 적용 + 라인 메트릭 계산. offsetX = 들여쓰기로 인한 라인 시작 위치 */
const buildLine = (
  para: Paragraph,
  paraIndex: number,
  frags: LineFrag[],
  start: number,
  end: number,
  isLast: boolean,
  measurer: TextMeasurer,
  width: number,
  offsetX: number,
): Line => {
  // 줄 끝 공백은 정렬 폭 계산에서 제외 (여백에 걸침)
  let trailing = frags.length;
  let effWidth = frags.reduce((n, f) => n + f.width, 0);
  while (trailing > 0) {
    const f = frags[trailing - 1];
    if (!f || f.kind !== "space") break;
    trailing--;
    effWidth -= f.width;
  }

  let placed = frags;
  const align = para.style.align;
  let alignX = 0;
  if (align === "center") alignX = Math.max(0, (width - effWidth) / 2);
  else if (align === "right") alignX = Math.max(0, width - effWidth);
  else if ((align === "justify" && !isLast) || align === "distribute") {
    const spaceCount = placed
      .slice(0, trailing)
      .filter((f) => f.kind === "space").length;
    if (spaceCount > 0 && effWidth < width) {
      const extra = (width - effWidth) / spaceCount;
      placed = placed.map((f, i) =>
        f.kind === "space" && i < trailing
          ? { ...f, width: f.width + extra }
          : f,
      );
    }
  }

  const x = offsetX + alignX;
  let cx = x;
  placed = placed.map((f) => {
    const p = { ...f, x: cx };
    cx += p.width;
    return p;
  });

  let ascent = 0;
  let descent = 0;
  const styles =
    placed.length > 0 ? placed.map((f) => f.style) : [para.markStyle];
  for (const s of styles) {
    const m = measurer.metrics(s);
    if (m.ascent > ascent) ascent = m.ascent;
    if (m.descent > descent) descent = m.descent;
  }
  const natural = ascent + descent;
  const height = natural * para.style.lineHeight;
  const baseline = ascent + (height - natural) / 2;

  return {
    para: paraIndex,
    start,
    end,
    frags: placed,
    x,
    baseline,
    height,
    isLast,
  };
};

/** 한 문단을 라인들로 배치 (그리디 줄바꿈 + 들여쓰기) */
/** 리스트 마커 폭 (px) — 마커 뒤 본문이 시작되는 간격 */
const LIST_INDENT = 24;

export const layoutParagraph = (
  para: Paragraph,
  paraIndex: number,
  measurer: TextMeasurer,
  contentWidth: number,
  markerText?: string,
): Line[] => {
  const st = para.style;
  const listIndent = markerText ? LIST_INDENT : 0;
  const indentLeft = Math.max(0, st.indentLeft * PT_TO_PX) + listIndent;
  const firstLineX = Math.max(
    0,
    indentLeft + st.indentFirstLine * PT_TO_PX, // 음수 = 내어쓰기
  );
  const offsetFor = (lineIdx: number): number =>
    lineIdx === 0 ? firstLineX : indentLeft;
  const availFor = (lineIdx: number): number =>
    Math.max(24, contentWidth - offsetFor(lineIdx));

  const lines: Line[] = [];
  let cur: LineFrag[] = [];
  let curWidth = 0;
  let lineStart = 0;

  const flush = (end: number, isLast: boolean): void => {
    const idx = lines.length;
    lines.push(
      buildLine(
        para,
        paraIndex,
        cur,
        lineStart,
        end,
        isLast,
        measurer,
        availFor(idx),
        offsetFor(idx),
      ),
    );
    cur = [];
    curWidth = 0;
    lineStart = end;
  };

  for (const token of tokenizeParagraph(para)) {
    const w = measurer.width(token.text, token.style);
    // 공백은 줄바꿈을 유발하지 않는다 (줄 끝에 걸침)
    if (
      token.kind !== "space" &&
      cur.length > 0 &&
      curWidth + w > availFor(lines.length)
    ) {
      flush(token.start, false);
    }
    if (token.kind !== "space" && w > availFor(lines.length)) {
      // 한 줄보다 긴 토큰 — 그래핌 단위 강제 분할
      let piece = "";
      let pieceStart = token.start;
      let pieceWidth = 0;
      for (const g of graphemes(token.text)) {
        const gw = measurer.width(g, token.style);
        if (piece && pieceWidth + gw > availFor(lines.length)) {
          cur.push({
            text: piece,
            style: token.style,
            x: 0,
            width: pieceWidth,
            start: pieceStart,
            kind: "word",
          });
          flush(pieceStart + piece.length, false);
          pieceStart += piece.length;
          piece = "";
          pieceWidth = 0;
        }
        piece += g;
        pieceWidth += gw;
      }
      if (piece) {
        cur.push({
          text: piece,
          style: token.style,
          x: 0,
          width: pieceWidth,
          start: pieceStart,
          kind: "word",
        });
        curWidth += pieceWidth;
      }
      continue;
    }
    cur.push({
      text: token.text,
      style: token.style,
      x: 0,
      width: w,
      start: token.start,
      kind: token.kind,
    });
    curWidth += w;
  }
  flush(paraLength(para), true);
  if (markerText && lines[0]) {
    lines[0] = {
      ...lines[0],
      marker: {
        text: markerText,
        style: para.markStyle,
        x: indentLeft - listIndent,
      },
    };
  }
  return lines;
};

/** 라인을 dx만큼 수평 이동한 사본 */
const shiftLine = (line: Line, dx: number): Line => ({
  ...line,
  x: line.x + dx,
  frags: line.frags.map((f) => ({ ...f, x: f.x + dx })),
  ...(line.marker ? { marker: { ...line.marker, x: line.marker.x + dx } } : {}),
});

type CellLayout = {
  x: number;
  fullWidth: number;
  lines: { line: Line; localY: number }[];
  height: number;
};

/** 문서 전체를 페이지로 배치 — 구역별 다단(cols) 지원 */
export const layoutDocument = (
  doc: DocModel,
  measurer: TextMeasurer,
): DocLayout => {
  const margin = doc.margins ?? { ...MARGIN };
  const contentWidth = PAGE_WIDTH - margin.left - margin.right;
  const contentHeight = PAGE_HEIGHT - margin.top - margin.bottom;

  let current: PageLine[] = [];
  const pages: PageLine[][] = [current];
  const all: PageLine[] = [];
  const borders: CellBorderRect[] = [];
  const shadings: (CellBorderRect & { color: string })[] = [];
  const boxes: (CellBorderRect & {
    sides: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  })[] = [];
  let y = 0;

  // ── 다단 상태 ──
  let cols = 1;
  let colGap = 0;
  let colIndex = 0;
  /** 현재 구역이 현재 페이지에서 시작한 y (단 나눔 시 되돌아갈 위치) */
  let sectionTop = 0;
  const colWidth = (): number =>
    Math.max(40, (contentWidth - (cols - 1) * colGap) / cols);
  const colX = (): number => colIndex * (colWidth() + colGap);

  const newPage = (): void => {
    current = [];
    pages.push(current);
    y = 0;
    colIndex = 0;
    sectionTop = 0;
  };

  /** 높이 h가 안 들어가면 다음 단/페이지로 넘어간다 */
  const breakIfNeeded = (h: number): void => {
    if (y + h <= contentHeight || current.length === 0) return;
    if (colIndex < cols - 1) {
      colIndex++;
      y = sectionTop;
    } else {
      newPage();
    }
  };

  /** 구역 진입 — 단 설정 갱신 */
  const enterSection = (config: { cols: number; colGap: number }): void => {
    cols = Math.max(1, config.cols);
    colGap = config.colGap;
    colIndex = 0;
    sectionTop = y;
  };

  // 번호 매기기 카운터 — 연속된 number 문단에서 증가, 끊기면 리셋
  let numCount = 0;
  const GANADA = "가나다라마바사아자차카타파하";
  const CONSONANT = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ";
  const ROMAN: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
    [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
    [5, "V"], [4, "IV"], [1, "I"],
  ];
  const roman = (n: number): string => {
    let out = "";
    let rest = n;
    for (const [v, sym] of ROMAN) {
      while (rest >= v) {
        out += sym;
        rest -= v;
      }
    }
    return out;
  };
  const numberMarker = (fmt: string, n: number): string => {
    if (fmt === "circled" && n <= 20) return String.fromCodePoint(0x2460 + n - 1);
    if (fmt === "ganada" && n <= GANADA.length) return `${GANADA.charAt(n - 1)}.`;
    if (fmt === "ganadaParen" && n <= GANADA.length)
      return `${GANADA.charAt(n - 1)})`;
    if (fmt === "consonantParen" && n <= CONSONANT.length)
      return `(${CONSONANT.charAt(n - 1)})`;
    if (fmt === "upperLetter" && n <= 26)
      return `${String.fromCharCode(64 + n)}.`;
    if (fmt === "upperRoman") return `${roman(n)}.`;
    if (fmt === "lowerRoman") return `${roman(n).toLowerCase()}.`;
    return `${n}.`;
  };
  const markerFor = (para: Paragraph): string | undefined => {
    if (para.style.list === "bullet") {
      numCount = 0;
      return para.style.bulletChar ?? "•";
    }
    if (para.style.list === "number") {
      numCount++;
      return numberMarker(para.style.numFmt ?? "decimal", numCount);
    }
    numCount = 0;
    return undefined;
  };

  const flowParagraph = (para: Paragraph, paraIndex: number): void => {
    if (current.length > 0) y += para.style.spaceBefore * PT_TO_PX;
    // 단락 음영/테두리 — 페이지·단이 바뀌면 사각형을 분할
    let blockTop: number | null = null;
    let blockPage = -1;
    let blockX = 0;
    const closeBlock = (): void => {
      if (blockTop === null) return;
      const rect = {
        page: blockPage,
        x: blockX,
        y: blockTop,
        width: colWidth(),
        height: y - blockTop,
      };
      if (para.style.shading)
        shadings.push({ ...rect, color: para.style.shading });
      const b = para.style.borders;
      if (b.top || b.right || b.bottom || b.left)
        boxes.push({ ...rect, sides: b });
      blockTop = null;
    };
    const pb = para.style.borders;
    const decorated =
      para.style.shading || pb.top || pb.right || pb.bottom || pb.left;
    for (const line of layoutParagraph(
      para,
      paraIndex,
      measurer,
      colWidth(),
      markerFor(para),
    )) {
      // 단/페이지 나눔 직전에 음영 블록을 닫는다 (y가 리셋되기 전)
      if (decorated && y + line.height > contentHeight && current.length > 0)
        closeBlock();
      breakIfNeeded(line.height);
      if (decorated && (blockPage !== pages.length - 1 || blockX !== colX())) {
        closeBlock();
        blockTop = y;
        blockPage = pages.length - 1;
        blockX = colX();
      }
      const placed: PageLine = {
        ...shiftLine(line, colX()),
        page: pages.length - 1,
        y,
      };
      current.push(placed);
      all.push(placed);
      y += line.height;
    }
    closeBlock();
    y += para.style.spaceAfter * PT_TO_PX;
  };

  /** [from, to) 구간의 같은 표 문단들을 그리드로 배치 */
  const flowTable = (from: number, to: number): void => {
    const first = doc.paragraphs[from];
    if (!first?.cell) return;
    const grid = first.cell.grid;
    const total = grid.reduce((n, w) => n + w, 0) || 1;
    const scale = total > colWidth() ? colWidth() / total : 1;
    const cellX: number[] = [0];
    for (const w of grid)
      cellX.push((cellX[cellX.length - 1] ?? 0) + w * scale);

    // row → (col 시작 순서대로) 셀 → 문단 인덱스 목록
    const rows = new Map<number, Map<number, number[]>>();
    for (let i = from; i < to; i++) {
      const cell = doc.paragraphs[i]?.cell;
      if (!cell) continue;
      let row = rows.get(cell.row);
      if (!row) {
        row = new Map();
        rows.set(cell.row, row);
      }
      const list = row.get(cell.col) ?? [];
      list.push(i);
      row.set(cell.col, list);
    }

    for (const rowKey of [...rows.keys()].sort((a, b) => a - b)) {
      const cells = rows.get(rowKey);
      if (!cells) continue;
      const layouts: CellLayout[] = [];
      for (const colKey of [...cells.keys()].sort((a, b) => a - b)) {
        const paraIndexes = cells.get(colKey) ?? [];
        const cellRef = doc.paragraphs[paraIndexes[0] ?? -1]?.cell;
        if (!cellRef) continue;
        const x = cellX[cellRef.col] ?? 0;
        const endX = cellX[Math.min(cellRef.col + cellRef.span, grid.length)];
        const fullWidth = (endX ?? colWidth()) - x;
        const innerWidth = Math.max(24, fullWidth - CELL_PAD_X * 2);
        const layout: CellLayout = { x, fullWidth, lines: [], height: 0 };
        let localY = 0;
        for (const pi of paraIndexes) {
          const para = doc.paragraphs[pi];
          if (!para) continue;
          localY += para.style.spaceBefore * PT_TO_PX;
          for (const line of layoutParagraph(
            para,
            pi,
            measurer,
            innerWidth,
            markerFor(para),
          )) {
            layout.lines.push({
              line: shiftLine(line, x + CELL_PAD_X),
              localY,
            });
            localY += line.height;
          }
          localY += para.style.spaceAfter * PT_TO_PX;
        }
        layout.height = localY;
        layouts.push(layout);
      }

      const rowHeight =
        Math.max(...layouts.map((c) => c.height), 0) + CELL_PAD_Y * 2;
      breakIfNeeded(rowHeight);
      for (const cell of layouts) {
        for (const { line, localY } of cell.lines) {
          const placed: PageLine = {
            ...shiftLine(line, colX()),
            page: pages.length - 1,
            y: y + CELL_PAD_Y + localY,
          };
          current.push(placed);
          all.push(placed);
        }
        borders.push({
          page: pages.length - 1,
          x: colX() + cell.x,
          y,
          width: cell.fullWidth,
          height: rowHeight,
        });
      }
      y += rowHeight;
    }
  };

  const sectionConfigs = doc.sections ?? [{ cols: 1, colGap: 0 }];
  let currentSection = -1;

  let i = 0;
  while (i < doc.paragraphs.length) {
    const para = doc.paragraphs[i];
    const sectionIdx = para?.section ?? 0;
    if (sectionIdx !== currentSection) {
      currentSection = sectionIdx;
      enterSection(sectionConfigs[sectionIdx] ?? { cols: 1, colGap: 0 });
    }
    if (para?.cell) {
      const tableId = para.cell.tableId;
      let j = i;
      while (j < doc.paragraphs.length) {
        const cell = doc.paragraphs[j]?.cell;
        if (!cell || cell.tableId !== tableId) break;
        j++;
      }
      flowTable(i, j);
      i = j;
    } else {
      if (para) flowParagraph(para, i);
      i++;
    }
  }

  return { pages, all, borders, shadings, boxes, margin };
};
