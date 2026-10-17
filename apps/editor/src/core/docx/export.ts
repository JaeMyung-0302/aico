/**
 * .docx 내보내기 — 최소 OOXML 패키지([Content_Types].xml + _rels + word/document.xml)를
 * 직접 생성해 zip(fflate)으로 묶는다. 서식 run/정렬/줄간격이 1:1로 매핑된다.
 */

import { strToU8, zipSync } from "fflate";
import type { Alignment, DocModel, Paragraph, Run } from "../model/types";

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** OOXML w:jc 값 (justify는 both) */
const JC: Record<Alignment, string> = {
  left: "left",
  center: "center",
  right: "right",
  justify: "both",
  distribute: "distribute",
};

/** 형광펜 hex → OOXML 색 이름 (Word 15색) */
const HIGHLIGHT_NAMES: Record<string, string> = {
  "#ffff00": "yellow",
  "#00ff00": "green",
  "#00ffff": "cyan",
  "#ff00ff": "magenta",
  "#0000ff": "blue",
  "#ff0000": "red",
  "#000080": "darkBlue",
  "#008080": "darkCyan",
  "#008000": "darkGreen",
  "#800080": "darkMagenta",
  "#800000": "darkRed",
  "#808000": "darkYellow",
  "#808080": "darkGray",
  "#c0c0c0": "lightGray",
  "#d9d9d9": "lightGray",
  "#000000": "black",
};

/** CSS 폰트 스택 → Word 폰트 이름 */
const fontName = (family: string): string => {
  const f = family.toLowerCase();
  if (f.includes("courier") || f.includes("monospace")) return "Courier New";
  if (f.includes("georgia") || f.includes("myungjo")) return "Georgia";
  return "Apple SD Gothic Neo";
};

const runXml = (run: Run): string => {
  const s = run.style;
  const font = fontName(s.fontFamily);
  const half = Math.round(s.fontSize * 2); // w:sz는 half-point 단위
  const props: string[] = [
    `<w:rFonts w:ascii="${font}" w:eastAsia="${font}" w:hAnsi="${font}"/>`,
  ];
  if (s.bold) props.push("<w:b/>");
  if (s.italic) props.push("<w:i/>");
  if (s.strike) props.push("<w:strike/>");
  if (s.underline) props.push(`<w:u w:val="${s.underlineStyle ?? "single"}"/>`);
  if (s.verticalAlign !== "baseline")
    props.push(
      `<w:vertAlign w:val="${s.verticalAlign === "super" ? "superscript" : "subscript"}"/>`,
    );
  if (s.highlight && HIGHLIGHT_NAMES[s.highlight])
    props.push(`<w:highlight w:val="${HIGHLIGHT_NAMES[s.highlight]}"/>`);
  props.push(`<w:color w:val="${s.color.replace("#", "").toUpperCase()}"/>`);
  props.push(`<w:sz w:val="${half}"/><w:szCs w:val="${half}"/>`);
  return `<w:r><w:rPr>${props.join("")}</w:rPr><w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
};

const paraXml = (para: Paragraph, sectPr?: string): string => {
  const st = para.style;
  // w:before/after는 twip(1/20pt), w:line은 1/240줄 (lineRule=auto)
  const spacing = `<w:spacing w:before="${Math.round(st.spaceBefore * 20)}" w:after="${Math.round(st.spaceAfter * 20)}" w:line="${Math.round(st.lineHeight * 240)}" w:lineRule="auto"/>`;
  let ind = "";
  if (st.indentLeft !== 0 || st.indentFirstLine !== 0) {
    const first =
      st.indentFirstLine < 0
        ? ` w:hanging="${Math.round(-st.indentFirstLine * 20)}"`
        : st.indentFirstLine > 0
          ? ` w:firstLine="${Math.round(st.indentFirstLine * 20)}"`
          : "";
    ind = `<w:ind w:left="${Math.round(st.indentLeft * 20)}"${first}/>`;
  }
  const numPr =
    st.list !== "none"
      ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${st.list === "bullet" ? 1 : 2}"/></w:numPr>`
      : "";
  const shd = st.shading
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${st.shading.replace("#", "").toUpperCase()}"/>`
    : "";
  const bd = st.borders;
  const pBdr =
    bd.top || bd.right || bd.bottom || bd.left
      ? "<w:pBdr>" +
        (["top", "left", "bottom", "right"] as const)
          .filter((side) => bd[side])
          .map(
            (side) =>
              `<w:${side} w:val="single" w:sz="4" w:space="1" w:color="auto"/>`,
          )
          .join("") +
        "</w:pBdr>"
      : "";
  const pPr = `<w:pPr>${numPr}${pBdr}${shd}${spacing}${ind}<w:jc w:val="${JC[st.align]}"/>${sectPr ?? ""}</w:pPr>`;
  return `<w:p>${pPr}${para.runs.map(runXml).join("")}</w:p>`;
};

const PX_TO_TWIP = 1440 / 96;

/** 같은 표에 속한 연속 문단들 → w:tbl */
const tableXml = (paras: Paragraph[]): string => {
  const grid = paras[0]?.cell?.grid ?? [];
  const gridXml = grid
    .map((w) => `<w:gridCol w:w="${Math.round(w * PX_TO_TWIP)}"/>`)
    .join("");
  const borders =
    "<w:tblBorders>" +
    ["top", "left", "bottom", "right", "insideH", "insideV"]
      .map(
        (s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`,
      )
      .join("") +
    "</w:tblBorders>";

  // row → col → 문단들 (문서 순서 유지)
  const rows = new Map<number, Map<number, Paragraph[]>>();
  for (const para of paras) {
    if (!para.cell) continue;
    let row = rows.get(para.cell.row);
    if (!row) {
      row = new Map();
      rows.set(para.cell.row, row);
    }
    const list = row.get(para.cell.col) ?? [];
    list.push(para);
    row.set(para.cell.col, list);
  }

  const rowsXml = [...rows.keys()]
    .sort((a, b) => a - b)
    .map((rowKey) => {
      const cells = rows.get(rowKey);
      if (!cells) return "";
      const cellsXml = [...cells.keys()]
        .sort((a, b) => a - b)
        .map((colKey) => {
          const cellParas = cells.get(colKey) ?? [];
          const cell = cellParas[0]?.cell;
          const span = cell?.span ?? 1;
          const width = grid
            .slice(cell?.col ?? 0, (cell?.col ?? 0) + span)
            .reduce((n, w) => n + w, 0);
          const tcPr =
            `<w:tcPr><w:tcW w:w="${Math.round(width * PX_TO_TWIP)}" w:type="dxa"/>` +
            (span > 1 ? `<w:gridSpan w:val="${span}"/>` : "") +
            "</w:tcPr>";
          const content = cellParas.map((p) => paraXml(p)).join("") || "<w:p/>";
          return `<w:tc>${tcPr}${content}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cellsXml}</w:tr>`;
    })
    .join("");

  return `<w:tbl><w:tblPr>${borders}<w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid>${gridXml}</w:tblGrid>${rowsXml}</w:tbl>`;
};

/** 본문 XML — 셀 문단은 표로 묶고 나머지는 순서대로 */
/** 구역 설정 → w:sectPr (mid = 문단 내 구역 나눔용) */
const sectPrXml = (doc: DocModel, sectionIdx: number): string => {
  const s = doc.sections?.[sectionIdx] ?? { cols: 1, colGap: 0 };
  const m = doc.margins ?? { top: 96, right: 96, bottom: 96, left: 96 };
  const t = (px: number): number => Math.round(px * PX_TO_TWIP);
  const cols =
    s.cols > 1
      ? `<w:cols w:num="${s.cols}" w:space="${t(s.colGap)}"/>`
      : `<w:cols w:space="0"/>`;
  return (
    `<w:sectPr><w:type w:val="continuous"/><w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="${t(m.top)}" w:right="${t(m.right)}" w:bottom="${t(m.bottom)}" w:left="${t(m.left)}" w:header="708" w:footer="708" w:gutter="0"/>` +
    cols +
    `</w:sectPr>`
  );
};

const bodyXml = (doc: DocModel): string => {
  const parts: string[] = [];
  const sectionOf = (index: number): number =>
    doc.paragraphs[index]?.section ?? 0;
  /** i 문단이 구역의 마지막이면 그 구역의 sectPr 반환 (본문 끝 구역 제외) */
  const closingSectPr = (i: number): string | undefined => {
    const cur = sectionOf(i);
    if (i + 1 >= doc.paragraphs.length) return undefined; // 마지막 구역은 body 끝에서
    return sectionOf(i + 1) !== cur ? sectPrXml(doc, cur) : undefined;
  };

  let i = 0;
  while (i < doc.paragraphs.length) {
    const para = doc.paragraphs[i];
    if (!para) break;
    if (para.cell) {
      const tableId = para.cell.tableId;
      let j = i;
      while (j < doc.paragraphs.length) {
        const cell = doc.paragraphs[j]?.cell;
        if (!cell || cell.tableId !== tableId) break;
        j++;
      }
      parts.push(tableXml(doc.paragraphs.slice(i, j)));
      // Word는 표 뒤에 문단이 필요하다. 구역 나눔이 겹치면 그 문단에 싣는다
      const sect = closingSectPr(j - 1);
      const next = doc.paragraphs[j];
      if (sect) parts.push(`<w:p><w:pPr>${sect}</w:pPr></w:p>`);
      else if (!next || next.cell) parts.push("<w:p/>");
      i = j;
    } else {
      parts.push(paraXml(para, closingSectPr(i)));
      i++;
    }
  }
  return parts.join("");
};

export const buildDocumentXml = (doc: DocModel): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
  bodyXml(doc) +
  sectPrXml(doc, Math.max(0, (doc.sections?.length ?? 1) - 1)) +
  `</w:body></w:document>`;

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
  `</Types>`;

/** 글머리 기호(1)/십진 번호(2) 정의 */
const NUMBERING_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>` +
  `<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>` +
  `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>` +
  `<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>` +
  `</w:numbering>`;

const DOC_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
  `</Relationships>`;

const RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

/** DocModel → .docx 바이너리 */
export const exportDocx = (doc: DocModel): Uint8Array =>
  zipSync({
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(RELS),
    "word/_rels/document.xml.rels": strToU8(DOC_RELS),
    "word/document.xml": strToU8(buildDocumentXml(doc)),
    "word/numbering.xml": strToU8(NUMBERING_XML),
  });
