/** 그래핌(사용자 인지 문자) 단위 경계 계산. 한글/이모지/결합 문자를 안전하게 다룬다. */

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export const graphemes = (text: string): string[] => {
  if (!segmenter) return Array.from(text);
  const out: string[] = [];
  for (const seg of segmenter.segment(text)) out.push(seg.segment);
  return out;
};

/** offset 직전의 그래핌 경계 (Backspace/왼쪽 이동용) */
export const prevGraphemeBoundary = (text: string, offset: number): number => {
  if (offset <= 0) return 0;
  if (!segmenter) return Math.max(0, offset - 1);
  let prev = 0;
  for (const seg of segmenter.segment(text)) {
    const end = seg.index + seg.segment.length;
    if (end >= offset) return seg.index;
    prev = end;
  }
  return prev;
};

/** offset 직후의 그래핌 경계 (Delete/오른쪽 이동용) */
export const nextGraphemeBoundary = (text: string, offset: number): number => {
  if (offset >= text.length) return text.length;
  if (!segmenter) return Math.min(text.length, offset + 1);
  for (const seg of segmenter.segment(text)) {
    const end = seg.index + seg.segment.length;
    if (end > offset) return end;
  }
  return text.length;
};

const WORD_CHAR = /[^\s]/;

/** offset 이전의 단어 경계 (Ctrl/Alt+왼쪽) */
export const prevWordBoundary = (text: string, offset: number): number => {
  let i = offset;
  while (i > 0 && !WORD_CHAR.test(text.charAt(i - 1))) i--;
  while (i > 0 && WORD_CHAR.test(text.charAt(i - 1))) i--;
  return i;
};

/** offset 이후의 단어 경계 (Ctrl/Alt+오른쪽) */
export const nextWordBoundary = (text: string, offset: number): number => {
  let i = offset;
  while (i < text.length && !WORD_CHAR.test(text.charAt(i))) i++;
  while (i < text.length && WORD_CHAR.test(text.charAt(i))) i++;
  return i;
};

/** offset이 속한 단어의 범위 (더블클릭 선택용) */
export const wordRangeAt = (
  text: string,
  offset: number,
): { start: number; end: number } => {
  if (text.length === 0) return { start: 0, end: 0 };
  const at = Math.min(offset, text.length - 1);
  if (!WORD_CHAR.test(text.charAt(at))) {
    // 공백 위를 클릭 — 공백 구간 전체 선택
    let s = at;
    let e = at + 1;
    while (s > 0 && !WORD_CHAR.test(text.charAt(s - 1))) s--;
    while (e < text.length && !WORD_CHAR.test(text.charAt(e))) e++;
    return { start: s, end: e };
  }
  let s = at;
  let e = at;
  while (s > 0 && WORD_CHAR.test(text.charAt(s - 1))) s--;
  while (e < text.length && WORD_CHAR.test(text.charAt(e))) e++;
  return { start: s, end: e };
};
