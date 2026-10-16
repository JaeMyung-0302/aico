/** 레이아웃 결과 타입. 좌표는 페이지 콘텐츠 영역(여백 제외) 기준 CSS px. */

import type { RunStyle } from "../model/types";

export type FragKind = "space" | "word" | "cjk";

export type LineFrag = {
  text: string;
  style: RunStyle;
  /** 콘텐츠 좌표 x (정렬 반영) */
  x: number;
  width: number;
  /** 문단 내 시작 문자 오프셋 */
  start: number;
  kind: FragKind;
};

export type Line = {
  para: number;
  /** 문단 내 시작 오프셋 (포함) */
  start: number;
  /** 문단 내 끝 오프셋 (미포함) */
  end: number;
  frags: LineFrag[];
  /** 정렬 반영된 라인 시작 x */
  x: number;
  /** 라인 위 끝에서 베이스라인까지의 거리 */
  baseline: number;
  height: number;
  /** 문단의 마지막 라인 여부 */
  isLast: boolean;
  /** 글머리 기호/번호 마커 (첫 라인에만) */
  marker?: { text: string; style: RunStyle; x: number };
};

export type PageLine = Line & {
  page: number;
  /** 페이지 콘텐츠 좌표 y (라인 위 끝) */
  y: number;
};

/** 표 셀 테두리 사각형 (콘텐츠 좌표) */
export type CellBorderRect = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocLayout = {
  pages: PageLine[][];
  /** 문서 순서대로 평탄화된 전체 라인 */
  all: PageLine[];
  /** 표 셀 테두리 */
  borders: CellBorderRect[];
  /** 단락 음영 사각형 */
  shadings: (CellBorderRect & { color: string })[];
  /** 단락 테두리 사각형 (면별) */
  boxes: (CellBorderRect & {
    sides: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  })[];
  /** 이 문서의 페이지 여백 (px) — 렌더러/히트테스트 좌표 기준 */
  margin: { top: number; right: number; bottom: number; left: number };
};
