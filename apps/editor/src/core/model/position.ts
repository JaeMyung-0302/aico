/** 문서 내 위치/범위. offset은 문단 내 문자 오프셋(UTF-16 코드 유닛 기준). */

export type DocPosition = {
  para: number;
  offset: number;
};

export type DocRange = {
  anchor: DocPosition;
  focus: DocPosition;
};

export const comparePositions = (a: DocPosition, b: DocPosition): number => {
  if (a.para !== b.para) return a.para < b.para ? -1 : 1;
  if (a.offset !== b.offset) return a.offset < b.offset ? -1 : 1;
  return 0;
};

export const isCollapsed = (range: DocRange): boolean =>
  comparePositions(range.anchor, range.focus) === 0;

/** anchor/focus를 문서 순서상 start/end로 정규화 */
export const normalizeRange = (
  range: DocRange,
): { start: DocPosition; end: DocPosition } => {
  if (comparePositions(range.anchor, range.focus) <= 0) {
    return { start: range.anchor, end: range.focus };
  }
  return { start: range.focus, end: range.anchor };
};

export const caretAt = (pos: DocPosition): DocRange => ({
  anchor: pos,
  focus: pos,
});
