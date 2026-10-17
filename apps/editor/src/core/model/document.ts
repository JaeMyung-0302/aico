/** 문서 불변 연산 — 삽입/삭제/분할/서식 적용. 모든 함수는 새 DocModel을 반환한다. */

import type {
  DocModel,
  Paragraph,
  ParagraphStyle,
  Run,
  RunStyle,
} from "./types";
import { DEFAULT_PARA_STYLE, DEFAULT_RUN_STYLE } from "./types";
import type { DocPosition, DocRange } from "./position";
import { normalizeRange } from "./position";

export const runStyleEquals = (a: RunStyle, b: RunStyle): boolean =>
  a.fontFamily === b.fontFamily &&
  a.fontSize === b.fontSize &&
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.underline === b.underline &&
  a.strike === b.strike &&
  a.color === b.color &&
  a.highlight === b.highlight &&
  a.verticalAlign === b.verticalAlign &&
  (a.underlineStyle ?? "single") === (b.underlineStyle ?? "single");

export const paraLength = (p: Paragraph): number =>
  p.runs.reduce((n, r) => n + r.text.length, 0);

export const paraText = (p: Paragraph): string =>
  p.runs.map((r) => r.text).join("");

/** 인덱스의 문단 반환 — 범위 밖이면 예외 (호출부 불변식 보장) */
export const paraAt = (doc: DocModel, index: number): Paragraph => {
  const para = doc.paragraphs[index];
  if (!para) throw new Error(`문단 인덱스 범위 초과: ${index}`);
  return para;
};

export const docText = (doc: DocModel): string =>
  doc.paragraphs.map(paraText).join("\n");

/** 빈 run 제거 + 동일 서식 인접 run 병합 */
export const normalizeRuns = (runs: Run[]): Run[] => {
  const merged: Run[] = [];
  for (const run of runs) {
    if (run.text.length === 0) continue;
    const last = merged[merged.length - 1];
    if (last && runStyleEquals(last.style, run.style)) {
      merged[merged.length - 1] = { ...last, text: last.text + run.text };
    } else {
      merged.push(run);
    }
  }
  return merged;
};

/** runs에서 [start, end) 문자 구간을 잘라낸다 */
export const sliceRuns = (runs: Run[], start: number, end: number): Run[] => {
  const out: Run[] = [];
  let pos = 0;
  for (const run of runs) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    const s = Math.max(start, runStart);
    const e = Math.min(end, runEnd);
    if (s < e)
      out.push({
        style: run.style,
        text: run.text.slice(s - runStart, e - runStart),
      });
    pos = runEnd;
  }
  return out;
};

/** 캐럿 위치의 입력 서식 — 직전 문자의 서식, 문단 맨 앞이면 첫 run, 빈 문단이면 markStyle */
export const styleAt = (doc: DocModel, pos: DocPosition): RunStyle => {
  const para = paraAt(doc, pos.para);
  if (!para) return DEFAULT_RUN_STYLE;
  if (para.runs.length === 0) return para.markStyle;
  let acc = 0;
  for (const run of para.runs) {
    const runEnd = acc + run.text.length;
    if (pos.offset <= runEnd && (pos.offset > acc || acc === 0))
      return run.style;
    acc = runEnd;
  }
  const lastRun = para.runs[para.runs.length - 1];
  return lastRun ? lastRun.style : para.markStyle;
};

const makeParagraph = (
  runs: Run[],
  style: ParagraphStyle,
  markStyle: RunStyle,
  template?: Pick<Paragraph, "cell" | "section">,
): Paragraph => ({
  runs: normalizeRuns(runs),
  style,
  markStyle,
  ...(template?.cell ? { cell: template.cell } : {}),
  ...(template?.section !== undefined ? { section: template.section } : {}),
});

const replaceParas = (
  doc: DocModel,
  index: number,
  count: number,
  paras: Paragraph[],
): DocModel => ({
  ...doc,
  paragraphs: [
    ...doc.paragraphs.slice(0, index),
    ...paras,
    ...doc.paragraphs.slice(index + count),
  ],
});

/** pos에 텍스트 삽입. '\n' 포함 시 문단 분할 */
export const insertTextAt = (
  doc: DocModel,
  pos: DocPosition,
  text: string,
  style: RunStyle,
): DocModel => {
  const para = paraAt(doc, pos.para);
  const len = paraLength(para);
  const head = sliceRuns(para.runs, 0, pos.offset);
  const tail = sliceRuns(para.runs, pos.offset, len);
  const segments = text.split("\n");
  if (segments.length === 1) {
    return replaceParas(doc, pos.para, 1, [
      makeParagraph(
        [...head, { text, style }, ...tail],
        para.style,
        para.markStyle,
        para,
      ),
    ]);
  }
  const paras = segments.map((seg, i) => {
    const runs: Run[] = [];
    if (i === 0) runs.push(...head);
    if (seg) runs.push({ text: seg, style });
    if (i === segments.length - 1) runs.push(...tail);
    return makeParagraph(runs, para.style, para.markStyle, para);
  });
  return replaceParas(doc, pos.para, 1, paras);
};

/** insertTextAt 후 캐럿이 놓일 위치 */
export const endOfInsertion = (pos: DocPosition, text: string): DocPosition => {
  const segments = text.split("\n");
  if (segments.length === 1)
    return { para: pos.para, offset: pos.offset + text.length };
  return {
    para: pos.para + segments.length - 1,
    offset: (segments[segments.length - 1] ?? "").length,
  };
};

/** 범위 삭제. 여러 문단에 걸치면 경계 문단을 병합한다 */
export const deleteRange = (doc: DocModel, range: DocRange): DocModel => {
  const { start, end } = normalizeRange(range);
  if (start.para === end.para && start.offset === end.offset) return doc;
  const startPara = paraAt(doc, start.para);
  const endPara = paraAt(doc, end.para);
  const head = sliceRuns(startPara.runs, 0, start.offset);
  const tail = sliceRuns(endPara.runs, end.offset, paraLength(endPara));
  const merged = makeParagraph(
    [...head, ...tail],
    startPara.style,
    endPara.markStyle,
    startPara,
  );
  return replaceParas(doc, start.para, end.para - start.para + 1, [merged]);
};

/** Enter — pos에서 문단 분할. 새 문단 기호는 분할 지점의 입력 서식을 따른다 */
export const splitParagraphAt = (doc: DocModel, pos: DocPosition): DocModel => {
  const para = paraAt(doc, pos.para);
  const head = sliceRuns(para.runs, 0, pos.offset);
  const tail = sliceRuns(para.runs, pos.offset, paraLength(para));
  // 분할 지점 직전 텍스트의 서식 — 새 문단 기호(¶)와 이후 입력이 이를 따른다
  const mark = styleAt(doc, pos);
  const first = makeParagraph(head, para.style, mark, para);
  // 꼬리가 비면(문단 끝 Enter) 새 문단의 기호도 직전 서식을 따른다 (기존 markStyle은 폐기)
  const second = makeParagraph(
    tail,
    para.style,
    tail.length > 0 ? para.markStyle : mark,
    para,
  );
  return replaceParas(doc, pos.para, 1, [first, second]);
};

/** 범위에 문자 서식 부분 적용. 문단 끝까지 포함되면 markStyle에도 적용 */
export const applyRunStyleToRange = (
  doc: DocModel,
  range: DocRange,
  patch: Partial<RunStyle>,
): DocModel => {
  const { start, end } = normalizeRange(range);
  const paragraphs = doc.paragraphs.map((para, i) => {
    if (i < start.para || i > end.para) return para;
    const len = paraLength(para);
    const from = i === start.para ? start.offset : 0;
    const to = i === end.para ? Math.min(end.offset, len) : len;
    const runs = [
      ...sliceRuns(para.runs, 0, from),
      ...sliceRuns(para.runs, from, to).map((r) => ({
        ...r,
        style: { ...r.style, ...patch },
      })),
      ...sliceRuns(para.runs, to, len),
    ];
    const coversMark = i < end.para || to >= len;
    return {
      ...para,
      runs: normalizeRuns(runs),
      markStyle: coversMark ? { ...para.markStyle, ...patch } : para.markStyle,
    };
  });
  return { ...doc, paragraphs };
};

/** 범위가 걸친 모든 문단에 문단 서식 부분 적용 */
export const applyParaStyleToRange = (
  doc: DocModel,
  range: DocRange,
  patch: Partial<ParagraphStyle>,
): DocModel => {
  const { start, end } = normalizeRange(range);
  const paragraphs = doc.paragraphs.map((para, i) =>
    i < start.para || i > end.para
      ? para
      : { ...para, style: { ...para.style, ...patch } },
  );
  return { ...doc, paragraphs };
};

/** 범위 내 텍스트를 fn으로 변환 (대소문자 바꾸기 등 — 길이 보존 가정) */
export const transformRangeText = (
  doc: DocModel,
  range: DocRange,
  fn: (text: string) => string,
): DocModel => {
  const { start, end } = normalizeRange(range);
  const paragraphs = doc.paragraphs.map((para, i) => {
    if (i < start.para || i > end.para) return para;
    const len = paraLength(para);
    const from = i === start.para ? start.offset : 0;
    const to = i === end.para ? Math.min(end.offset, len) : len;
    const runs = [
      ...sliceRuns(para.runs, 0, from),
      ...sliceRuns(para.runs, from, to).map((r) => ({
        ...r,
        text: fn(r.text),
      })),
      ...sliceRuns(para.runs, to, len),
    ];
    return { ...para, runs: normalizeRuns(runs) };
  });
  return { ...doc, paragraphs };
};

/** [startPara, endPara] 문단을 텍스트 기준 정렬 (표 문단이 섞이면 no-op) */
export const sortParagraphRange = (
  doc: DocModel,
  startPara: number,
  endPara: number,
): DocModel => {
  const slice = doc.paragraphs.slice(startPara, endPara + 1);
  if (slice.length < 2 || slice.some((p) => p.cell)) return doc;
  const sorted = [...slice].sort((a, b) =>
    paraText(a).localeCompare(paraText(b), "ko"),
  );
  return {
    ...doc,
    paragraphs: [
      ...doc.paragraphs.slice(0, startPara),
      ...sorted,
      ...doc.paragraphs.slice(endPara + 1),
    ],
  };
};

/** 범위의 일반 텍스트 (문단 사이 '\n') */
export const rangeText = (doc: DocModel, range: DocRange): string => {
  const { start, end } = normalizeRange(range);
  if (start.para === end.para) {
    return paraText(paraAt(doc, start.para)).slice(start.offset, end.offset);
  }
  const parts: string[] = [
    paraText(paraAt(doc, start.para)).slice(start.offset),
  ];
  for (let i = start.para + 1; i < end.para; i++)
    parts.push(paraText(paraAt(doc, i)));
  parts.push(paraText(paraAt(doc, end.para)).slice(0, end.offset));
  return parts.join("\n");
};

export const docEndPosition = (doc: DocModel): DocPosition => {
  const last = doc.paragraphs.length - 1;
  return { para: last, offset: paraLength(paraAt(doc, last)) };
};

/** 위치를 문서 범위 안으로 보정 */
export const clampPosition = (doc: DocModel, pos: DocPosition): DocPosition => {
  const para = Math.max(0, Math.min(pos.para, doc.paragraphs.length - 1));
  const offset = Math.max(
    0,
    Math.min(pos.offset, paraLength(paraAt(doc, para))),
  );
  return { para, offset };
};

/** 일반 텍스트로 문서 생성 */
export const docFromText = (text: string): DocModel => ({
  paragraphs: text.split("\n").map((line) => ({
    runs: line ? [{ text: line, style: DEFAULT_RUN_STYLE }] : [],
    style: DEFAULT_PARA_STYLE,
    markStyle: DEFAULT_RUN_STYLE,
  })),
});
