/** 페이지 규격 — A4 세로, 96dpi CSS px 기준. 여백은 Word 기본값(2.54cm = 1in). */

export const PT_TO_PX = 96 / 72;

export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

export const MARGIN = { top: 96, right: 96, bottom: 96, left: 96 };

export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right;
export const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN.top - MARGIN.bottom;
