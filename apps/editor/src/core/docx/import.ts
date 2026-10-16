/**
 * .docx 가져오기 — word/document.xml + styles.xml을 파싱해 DocModel로 변환한다.
 * 서식 해석 순서: 기본값 ← docDefaults ← pStyle(basedOn 체인) ← 직접 서식.
 * 표(w:tbl)는 셀 정보(CellRef)가 붙은 문단으로 변환된다. 브라우저 전용(DOMParser).
 */

import { strFromU8, unzipSync } from "fflate";
import type {
  CellRef,
  DocModel,
  PageMargins,
  Paragraph,
  ParagraphStyle,
  Run,
  RunStyle,
  SectionConfig,
} from "../model/types";
import { DEFAULT_PARA_STYLE, DEFAULT_RUN_STYLE } from "../model/types";
import { normalizeRuns } from "../model/document";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TWIP_TO_PX = 96 / 1440;
const TWIP_TO_PT = 1 / 20;

const childByLocal = (parent: Element, local: string): Element | null => {
  for (const child of Array.from(parent.children)) {
    if (child.localName === local) return child;
  }
  return null;
};

const attr = (el: Element, name: string): string | null =>
  el.getAttributeNS(W_NS, name) ?? el.getAttribute(`w:${name}`);

const numAttr = (el: Element | null, name: string): number | null => {
  if (!el) return null;
  const v = Number(attr(el, name));
  return Number.isFinite(v) ? v : null;
};

/** w:b 같은 토글 요소의 on/off */
const flagVal = (el: Element): boolean => {
  const val = attr(el, "val");
  return val === null || (val !== "false" && val !== "0" && val !== "none");
};

/** Word 폰트 이름 → 에디터 폰트 스택 */
const fontStack = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("courier") || n.includes("mono"))
    return '"Courier New", monospace';
  if (
    n.includes("georgia") ||
    n.includes("myungjo") ||
    n.includes("batang") ||
    n.includes("명조") ||
    n.includes("바탕") ||
    n.includes("serif")
  )
    return 'Georgia, "Apple Myungjo", serif';
  return DEFAULT_RUN_STYLE.fontFamily;
};

/** rPr → 명시된 속성만 담은 부분 서식 */
const parseRunProps = (rPr: Element | null): Partial<RunStyle> => {
  if (!rPr) return {};
  const out: Partial<RunStyle> = {};
  const b = childByLocal(rPr, "b");
  if (b) out.bold = flagVal(b);
  const i = childByLocal(rPr, "i");
  if (i) out.italic = flagVal(i);
  const strike = childByLocal(rPr, "strike");
  if (strike) out.strike = flagVal(strike);
  const u = childByLocal(rPr, "u");
  if (u) {
    const uv = attr(u, "val");
    out.underline = uv !== "none";
    const styles = [
      "double",
      "thick",
      "dotted",
      "dash",
      "dotDash",
      "dotDotDash",
      "wave",
    ] as const;
    out.underlineStyle = styles.find((v) => v === uv) ?? "single";
  }
  const sz = numAttr(childByLocal(rPr, "sz"), "val");
  if (sz !== null && sz > 0) out.fontSize = sz / 2;
  const colorEl = childByLocal(rPr, "color");
  const color = colorEl ? attr(colorEl, "val") : null;
  if (color && /^[0-9a-fA-F]{6}$/.test(color))
    out.color = `#${color.toLowerCase()}`;
  const rFonts = childByLocal(rPr, "rFonts");
  const font = rFonts
    ? (attr(rFonts, "ascii") ?? attr(rFonts, "eastAsia"))
    : null;
  if (font) out.fontFamily = fontStack(font);
  const vert = childByLocal(rPr, "vertAlign");
  if (vert) {
    const v = attr(vert, "val");
    out.verticalAlign =
      v === "superscript" ? "super" : v === "subscript" ? "sub" : "baseline";
  }
  const hl = childByLocal(rPr, "highlight");
  if (hl) {
    const v = attr(hl, "val");
    out.highlight =
      (v && HIGHLIGHT_HEX[v]) || (v === "none" ? null : "#ffff00");
  }
  return out;
};

/** OOXML 형광펜 색 이름 → hex */
const HIGHLIGHT_HEX: Record<string, string> = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  darkGray: "#808080",
  lightGray: "#c0c0c0",
  black: "#000000",
};

/** pPr → 명시된 속성만 담은 부분 문단 서식 */
const parseParaProps = (pPr: Element | null): Partial<ParagraphStyle> => {
  if (!pPr) return {};
  const out: Partial<ParagraphStyle> = {};
  const jcEl = childByLocal(pPr, "jc");
  const jc = jcEl ? attr(jcEl, "val") : null;
  if (jc) {
    out.align =
      jc === "center"
        ? "center"
        : jc === "right" || jc === "end"
          ? "right"
          : jc === "distribute"
            ? "distribute"
            : jc === "both" || jc === "justify"
              ? "justify"
              : "left";
  }
  const shd = childByLocal(pPr, "shd");
  if (shd) {
    const fill = attr(shd, "fill");
    out.shading =
      fill && /^[0-9a-fA-F]{6}$/.test(fill) ? `#${fill.toLowerCase()}` : null;
  }
  const pBdr = childByLocal(pPr, "pBdr");
  if (pBdr) {
    const sideOn = (name: string): boolean => {
      const el = childByLocal(pBdr, name);
      return el !== null && attr(el, "val") !== "none";
    };
    out.borders = {
      top: sideOn("top"),
      right: sideOn("right"),
      bottom: sideOn("bottom"),
      left: sideOn("left"),
    };
  }
  const spacing = childByLocal(pPr, "spacing");
  const before = numAttr(spacing, "before");
  if (before !== null) out.spaceBefore = before * TWIP_TO_PT;
  const after = numAttr(spacing, "after");
  if (after !== null) out.spaceAfter = after * TWIP_TO_PT;
  const line = numAttr(spacing, "line");
  const lineRule = spacing ? attr(spacing, "lineRule") : null;
  if (line !== null && line > 0 && (lineRule === null || lineRule === "auto")) {
    out.lineHeight = Math.min(3, Math.max(1, line / 240));
  }
  const ind = childByLocal(pPr, "ind");
  if (ind) {
    const left = numAttr(ind, "left") ?? numAttr(ind, "start");
    if (left !== null) out.indentLeft = left * TWIP_TO_PT;
    const firstLine = numAttr(ind, "firstLine");
    const hanging = numAttr(ind, "hanging");
    if (hanging !== null) out.indentFirstLine = -hanging * TWIP_TO_PT;
    else if (firstLine !== null) out.indentFirstLine = firstLine * TWIP_TO_PT;
  }
  return out;
};

type StyleDef = {
  run: Partial<RunStyle>;
  para: Partial<ParagraphStyle>;
  basedOn: string | null;
};

type StyleContext = {
  defRun: Partial<RunStyle>;
  defPara: Partial<ParagraphStyle>;
  byId: Map<string, StyleDef>;
  /** numId → 리스트 형식 (numbering.xml) */
  numFmt: Map<string, "bullet" | "number">;
};

/** styles.xml → docDefaults + 스타일 정의 (basedOn 체인은 resolveStyle에서 병합) */
const parseStyles = (xml: string | null): StyleContext => {
  const ctx: StyleContext = {
    defRun: {},
    defPara: {},
    byId: new Map(),
    numFmt: new Map(),
  };
  if (!xml) return ctx;
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  const defaults = dom.getElementsByTagNameNS(W_NS, "docDefaults")[0];
  if (defaults) {
    const rDef = defaults.getElementsByTagNameNS(W_NS, "rPrDefault")[0];
    const rPr = rDef ? childByLocal(rDef, "rPr") : null;
    ctx.defRun = parseRunProps(rPr);
    const pDef = defaults.getElementsByTagNameNS(W_NS, "pPrDefault")[0];
    const pPr = pDef ? childByLocal(pDef, "pPr") : null;
    ctx.defPara = parseParaProps(pPr);
  }
  for (const style of Array.from(dom.getElementsByTagNameNS(W_NS, "style"))) {
    const id = attr(style, "styleId");
    if (!id) continue;
    const basedOnEl = childByLocal(style, "basedOn");
    ctx.byId.set(id, {
      run: parseRunProps(childByLocal(style, "rPr")),
      para: parseParaProps(childByLocal(style, "pPr")),
      basedOn: basedOnEl ? attr(basedOnEl, "val") : null,
    });
  }
  return ctx;
};

/** numbering.xml → numId별 리스트 형식 */
const parseNumbering = (ctx: StyleContext, xml: string | null): void => {
  if (!xml) return;
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  // abstractNumId → 형식 (ilvl 0의 numFmt)
  const abstractFmt = new Map<string, "bullet" | "number">();
  for (const abs of Array.from(
    dom.getElementsByTagNameNS(W_NS, "abstractNum"),
  )) {
    const id = attr(abs, "abstractNumId");
    const lvl = Array.from(abs.children).find(
      (c) => c.localName === "lvl" && attr(c, "ilvl") === "0",
    );
    const fmtEl = lvl ? childByLocal(lvl, "numFmt") : null;
    const fmt = fmtEl ? attr(fmtEl, "val") : null;
    if (id) abstractFmt.set(id, fmt === "bullet" ? "bullet" : "number");
  }
  for (const num of Array.from(dom.getElementsByTagNameNS(W_NS, "num"))) {
    const numId = attr(num, "numId");
    const absEl = childByLocal(num, "abstractNumId");
    const absId = absEl ? attr(absEl, "val") : null;
    const fmt = absId ? abstractFmt.get(absId) : undefined;
    if (numId && fmt) ctx.numFmt.set(numId, fmt);
  }
};

/** basedOn 체인을 병합한 스타일 (조상 → 자손 순으로 덮어씀) */
const resolveStyle = (
  ctx: StyleContext,
  id: string | null,
): { run: Partial<RunStyle>; para: Partial<ParagraphStyle> } => {
  const chain: StyleDef[] = [];
  let cur = id;
  for (let depth = 0; cur && depth < 8; depth++) {
    const def = ctx.byId.get(cur);
    if (!def) break;
    chain.unshift(def);
    cur = def.basedOn;
  }
  const run: Partial<RunStyle> = {};
  const para: Partial<ParagraphStyle> = {};
  for (const def of chain) {
    Object.assign(run, def.run);
    Object.assign(para, def.para);
  }
  return { run, para };
};

const makeParagraph = (
  runs: Run[],
  style: ParagraphStyle,
  cell?: CellRef,
): Paragraph => {
  const normalized = normalizeRuns(runs);
  return {
    runs: normalized,
    style,
    markStyle: normalized[normalized.length - 1]?.style ?? DEFAULT_RUN_STYLE,
    ...(cell ? { cell } : {}),
  };
};

/** w:p 하나 → 문단 목록 (w:br 줄바꿈은 문단 분할로 처리) */
const parseParagraph = (
  p: Element,
  ctx: StyleContext,
  cell?: CellRef,
): Paragraph[] => {
  const pPr = childByLocal(p, "pPr");
  const pStyleEl = pPr ? childByLocal(pPr, "pStyle") : null;
  const styleDef = resolveStyle(ctx, pStyleEl ? attr(pStyleEl, "val") : null);
  const paraStyle: ParagraphStyle = {
    ...DEFAULT_PARA_STYLE,
    ...ctx.defPara,
    ...styleDef.para,
    ...parseParaProps(pPr),
  };
  // 번호 매기기 (w:numPr → numbering.xml의 형식)
  const numPr = pPr ? childByLocal(pPr, "numPr") : null;
  if (numPr) {
    const numIdEl = childByLocal(numPr, "numId");
    const numId = numIdEl ? attr(numIdEl, "val") : null;
    const fmt = numId ? ctx.numFmt.get(numId) : undefined;
    if (fmt) paraStyle.list = fmt;
  }
  const baseRun: RunStyle = {
    ...DEFAULT_RUN_STYLE,
    ...ctx.defRun,
    ...styleDef.run,
  };

  const paragraphs: Paragraph[] = [];
  let cur: Run[] = [];
  for (const r of Array.from(p.getElementsByTagNameNS(W_NS, "r"))) {
    const runStyle: RunStyle = {
      ...baseRun,
      ...parseRunProps(childByLocal(r, "rPr")),
    };
    for (const node of Array.from(r.children)) {
      if (node.localName === "t") {
        const text = node.textContent ?? "";
        if (text) cur.push({ text, style: runStyle });
      } else if (node.localName === "tab") {
        cur.push({ text: "    ", style: runStyle });
      } else if (node.localName === "br" || node.localName === "cr") {
        paragraphs.push(makeParagraph(cur, paraStyle, cell));
        cur = [];
      }
    }
  }
  paragraphs.push(makeParagraph(cur, paraStyle, cell));
  return paragraphs;
};

/** w:tbl → 셀 정보가 붙은 문단 목록 */
const parseTable = (
  tbl: Element,
  ctx: StyleContext,
  tableId: number,
): Paragraph[] => {
  const gridEl = childByLocal(tbl, "tblGrid");
  const grid = gridEl
    ? Array.from(gridEl.children)
        .filter((c) => c.localName === "gridCol")
        .map((c) => Math.max(20, (numAttr(c, "w") ?? 1500) * TWIP_TO_PX))
    : [];

  const out: Paragraph[] = [];
  let rowIndex = 0;
  for (const tr of Array.from(tbl.children)) {
    if (tr.localName !== "tr") continue;
    let col = 0;
    for (const tc of Array.from(tr.children)) {
      if (tc.localName !== "tc") continue;
      const tcPr = childByLocal(tc, "tcPr");
      const span = Math.max(
        1,
        numAttr(tcPr ? childByLocal(tcPr, "gridSpan") : null, "val") ?? 1,
      );
      const cellRef: CellRef = {
        tableId,
        row: rowIndex,
        col,
        span,
        grid: grid.length > 0 ? grid : [CONTENT_FALLBACK],
      };
      const cellParas: Paragraph[] = [];
      for (const child of Array.from(tc.children)) {
        if (child.localName === "p") {
          cellParas.push(...parseParagraph(child, ctx, cellRef));
        } else if (child.localName === "tbl") {
          // 중첩 표는 셀 문단으로 평탄화
          for (const p of Array.from(child.getElementsByTagNameNS(W_NS, "p"))) {
            cellParas.push(...parseParagraph(p, ctx, cellRef));
          }
        }
      }
      if (cellParas.length === 0) {
        cellParas.push(
          makeParagraph([], { ...DEFAULT_PARA_STYLE, spaceAfter: 0 }, cellRef),
        );
      }
      out.push(...cellParas);
      col += span;
    }
    rowIndex++;
  }
  return out;
};

/** 그리드 정보가 없을 때의 대체 폭 (px) */
const CONTENT_FALLBACK = 602;

/** .docx 바이너리 → DocModel */
export const importDocx = (data: Uint8Array): DocModel => {
  const files = unzipSync(data);
  const docEntry = files["word/document.xml"];
  if (!docEntry) throw new Error("word/document.xml이 없는 파일입니다");
  const stylesEntry = files["word/styles.xml"];
  const ctx = parseStyles(stylesEntry ? strFromU8(stylesEntry) : null);
  const numberingEntry = files["word/numbering.xml"];
  parseNumbering(ctx, numberingEntry ? strFromU8(numberingEntry) : null);

  const dom = new DOMParser().parseFromString(
    strFromU8(docEntry),
    "application/xml",
  );
  if (dom.getElementsByTagName("parsererror").length > 0) {
    throw new Error("document.xml 파싱에 실패했습니다");
  }
  const body = dom.getElementsByTagNameNS(W_NS, "body")[0];
  if (!body) throw new Error("문서 본문(w:body)을 찾을 수 없습니다");

  const paragraphs: Paragraph[] = [];
  const sections: SectionConfig[] = [];
  let sectionStart = 0;
  let tableId = 0;
  let margins: PageMargins | undefined;

  const parseSectPr = (sectPr: Element): SectionConfig => {
    const colsEl = childByLocal(sectPr, "cols");
    const num = colsEl ? (numAttr(colsEl, "num") ?? 1) : 1;
    const space = colsEl ? (numAttr(colsEl, "space") ?? 425) : 425;
    const pgMar = childByLocal(sectPr, "pgMar");
    if (pgMar) {
      margins = {
        top: (numAttr(pgMar, "top") ?? 1440) * TWIP_TO_PX,
        right: (numAttr(pgMar, "right") ?? 1440) * TWIP_TO_PX,
        bottom: (numAttr(pgMar, "bottom") ?? 1440) * TWIP_TO_PX,
        left: (numAttr(pgMar, "left") ?? 1440) * TWIP_TO_PX,
      };
    }
    return { cols: Math.max(1, num), colGap: space * TWIP_TO_PX };
  };

  /** 구역 마감 — 지금까지의 문단에 구역 인덱스를 부여 */
  const closeSection = (sectPr: Element): void => {
    const idx = sections.length;
    sections.push(parseSectPr(sectPr));
    for (let k = sectionStart; k < paragraphs.length; k++) {
      const para = paragraphs[k];
      if (para) paragraphs[k] = { ...para, section: idx };
    }
    sectionStart = paragraphs.length;
  };

  let bodySectPr: Element | null = null;
  for (const child of Array.from(body.children)) {
    if (child.localName === "p") {
      paragraphs.push(...parseParagraph(child, ctx));
      // 문단 pPr 안의 sectPr = 구역 나눔
      const pPr = childByLocal(child, "pPr");
      const midSect = pPr ? childByLocal(pPr, "sectPr") : null;
      if (midSect) closeSection(midSect);
    } else if (child.localName === "tbl") {
      paragraphs.push(...parseTable(child, ctx, tableId++));
    } else if (child.localName === "sectPr") {
      bodySectPr = child;
    }
  }
  if (bodySectPr) closeSection(bodySectPr);

  if (paragraphs.length === 0) {
    paragraphs.push(makeParagraph([], DEFAULT_PARA_STYLE));
  }
  return {
    paragraphs,
    ...(sections.length > 0 ? { sections } : {}),
    ...(margins ? { margins } : {}),
  };
};
