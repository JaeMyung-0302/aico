/**
 * 문서 모델 타입 정의.
 * Word와 동일하게 문서 = 문단(Paragraph) 목록, 문단 = 서식 run 목록으로 표현한다.
 * 모든 구조는 불변(immutable) — 수정 시 새 객체를 만든다.
 */

export type UnderlineStyle =
  | "single"
  | "double"
  | "thick"
  | "dotted"
  | "dash"
  | "dotDash"
  | "dotDotDash"
  | "wave";

export type RunStyle = {
  fontFamily: string;
  /** pt 단위 (Word와 동일). 렌더링 시 px로 환산 */
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** 밑줄 종류 (underline=true일 때, 기본 single) */
  underlineStyle?: UnderlineStyle;
  strike: boolean;
  color: string;
  /** 형광펜 배경색 (null = 없음) */
  highlight: string | null;
  /** 위/아래 첨자 */
  verticalAlign: "baseline" | "super" | "sub";
};

export type Run = {
  text: string;
  style: RunStyle;
};

export type Alignment = "left" | "center" | "right" | "justify" | "distribute";

export type ParagraphStyle = {
  align: Alignment;
  /** 줄 높이 배수 (1 = 글꼴 기본 높이) */
  lineHeight: number;
  /** 문단 앞 간격 (pt) */
  spaceBefore: number;
  /** 문단 뒤 간격 (pt) */
  spaceAfter: number;
  /** 왼쪽 들여쓰기 (pt) */
  indentLeft: number;
  /** 첫 줄 추가 들여쓰기 (pt, 음수 = 내어쓰기) */
  indentFirstLine: number;
  /** 글머리 기호/번호 매기기 */
  list: "none" | "bullet" | "number";
  /** 글머리 기호 문자 (기본 •) */
  bulletChar?: string;
  /** 번호 매기기 서식 */
  numFmt?:
    | "decimal"
    | "circled"
    | "upperRoman"
    | "lowerRoman"
    | "upperLetter"
    | "ganada"
    | "ganadaParen"
    | "consonantParen";
  /** 단락 음영 배경색 (null = 없음) */
  shading: string | null;
  /** 단락 테두리 (면별) */
  borders: { top: boolean; right: boolean; bottom: boolean; left: boolean };
};

/** 문단이 표 셀에 속할 때의 셀 정보. 같은 표의 문단들은 동일한 grid 배열을 공유한다 */
export type CellRef = {
  tableId: number;
  row: number;
  /** 그리드 열 인덱스 (병합 시작 열) */
  col: number;
  /** 가로 병합 열 수 (gridSpan) */
  span: number;
  /** 표 전체의 열 폭 목록 (px) */
  grid: number[];
};

/** 구역(section) 설정 — Word의 sectPr. 다단 배치를 결정한다 */
export type SectionConfig = {
  /** 단 수 (1 = 일반) */
  cols: number;
  /** 단 사이 간격 (px) */
  colGap: number;
};

/** 페이지 여백 (px) */
export type PageMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type Paragraph = {
  runs: Run[];
  style: ParagraphStyle;
  /** 표 셀 소속 정보 (없으면 일반 본문 문단) */
  cell?: CellRef;
  /** 소속 구역 인덱스 (없으면 0) */
  section?: number;
  /**
   * 문단 기호(¶)의 서식. Word의 paragraph mark와 동일한 개념으로,
   * 빈 문단의 캐럿 높이와 새 입력의 기본 서식을 결정한다.
   */
  markStyle: RunStyle;
};

export type DocModel = {
  paragraphs: Paragraph[];
  /** 구역 설정 목록 (paragraph.section이 인덱스) — 없으면 1단 단일 구역 */
  sections?: SectionConfig[];
  /** 페이지 여백 — 없으면 기본값(1인치) */
  margins?: PageMargins;
};

export const DEFAULT_RUN_STYLE: RunStyle = {
  fontFamily: 'system-ui, "Apple SD Gothic Neo", sans-serif',
  fontSize: 11,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  color: "#1f1f1f",
  highlight: null,
  verticalAlign: "baseline",
};

export const DEFAULT_PARA_STYLE: ParagraphStyle = {
  align: "left",
  lineHeight: 1.15,
  spaceBefore: 0,
  spaceAfter: 8,
  indentLeft: 0,
  indentFirstLine: 0,
  list: "none",
  shading: null,
  borders: { top: false, right: false, bottom: false, left: false },
};
