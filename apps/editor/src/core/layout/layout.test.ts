import { describe, expect, it } from "vitest";
import type { Paragraph } from "../model/types";
import { DEFAULT_PARA_STYLE, DEFAULT_RUN_STYLE } from "../model/types";
import { CONTENT_HEIGHT } from "./constants";
import { layoutDocument, layoutParagraph } from "./layout";
import type { TextMeasurer } from "./metrics";

/** 결정적 가짜 측정기 — 글자당 폭 = fontSize(px), ascent/descent = 0.8/0.2 * fontSize */
const fake: TextMeasurer = {
  width: (text, style) => [...text].length * style.fontSize,
  metrics: (style) => ({
    ascent: style.fontSize * 0.8,
    descent: style.fontSize * 0.2,
  }),
};

const para = (
  text: string,
  overrides?: Partial<Paragraph["style"]>,
): Paragraph => ({
  runs: text ? [{ text, style: { ...DEFAULT_RUN_STYLE, fontSize: 10 } }] : [],
  style: {
    ...DEFAULT_PARA_STYLE,
    lineHeight: 1,
    spaceBefore: 0,
    spaceAfter: 0,
    ...overrides,
  },
  markStyle: { ...DEFAULT_RUN_STYLE, fontSize: 10 },
});

describe("layoutParagraph", () => {
  it("영문은 단어 단위로 줄바꿈된다", () => {
    // 폭 100 = 글자 10개. "aaaa bbbb cccc" → "aaaa bbbb " / "cccc"
    const lines = layoutParagraph(para("aaaa bbbb cccc"), 0, fake, 100);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.end).toBe(10);
    expect(lines[1]?.start).toBe(10);
    expect(lines[1]?.isLast).toBe(true);
  });

  it("줄 끝 공백은 줄바꿈을 유발하지 않는다 (여백에 걸침)", () => {
    const lines = layoutParagraph(para("aaaaaaaa   b"), 0, fake, 100);
    expect(lines).toHaveLength(2);
    // 공백 3개는 첫 줄에 남는다
    expect(lines[0]?.end).toBe(11);
  });

  it("한글은 글자 단위로 줄바꿈된다", () => {
    const lines = layoutParagraph(para("가나다라마바사"), 0, fake, 45);
    // 폭 45 = 글자 4개(40) + 잔여 → 4자/줄
    expect(lines).toHaveLength(2);
    expect(lines[0]?.end).toBe(4);
  });

  it("한 줄보다 긴 단어는 강제 분할된다", () => {
    const lines = layoutParagraph(para("abcdefghijklmno"), 0, fake, 50);
    expect(lines.length).toBe(3);
    expect(lines[0]?.end).toBe(5);
  });

  it("빈 문단도 라인 하나를 가진다", () => {
    const lines = layoutParagraph(para(""), 0, fake, 100);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.height).toBe(10); // (8 + 2) * lineHeight 1
  });

  it("가운데/오른쪽 정렬 x 오프셋", () => {
    const center = layoutParagraph(
      para("abcd", { align: "center" }),
      0,
      fake,
      100,
    );
    expect(center[0]?.x).toBe(30);
    const right = layoutParagraph(
      para("abcd", { align: "right" }),
      0,
      fake,
      100,
    );
    expect(right[0]?.x).toBe(60);
  });

  it("양쪽 맞춤은 마지막 줄을 제외하고 공백을 늘린다", () => {
    const lines = layoutParagraph(
      para("aaaa bbbb cc dd", { align: "justify" }),
      0,
      fake,
      100,
    );
    expect(lines.length).toBe(2);
    const spaces = lines[0]?.frags.filter((f) => f.kind === "space");
    // 첫 줄 "aaaa bbbb " → 유효 폭 90(공백 1 포함 9글자), 여분 10을 공백 1개에 배분
    expect(spaces?.[0]?.width).toBe(20);
    // 마지막 줄은 그대로
    const lastSpaces = (lines[1]?.frags ?? []).filter(
      (f) => f.kind === "space",
    );
    for (const s of lastSpaces) expect(s.width).toBe(10);
  });
});

describe("layoutDocument", () => {
  it("콘텐츠 높이를 넘으면 새 페이지로 넘어간다", () => {
    const big = { ...DEFAULT_RUN_STYLE, fontSize: 100 }; // 라인 높이 100
    const paragraphs = Array.from({ length: 20 }, () => ({
      runs: [{ text: "a", style: big }],
      style: {
        ...DEFAULT_PARA_STYLE,
        lineHeight: 1,
        spaceBefore: 0,
        spaceAfter: 0,
      },
      markStyle: big,
    }));
    const layout = layoutDocument({ paragraphs }, fake);
    const perPage = Math.floor(CONTENT_HEIGHT / 100);
    expect(layout.pages.length).toBe(Math.ceil(20 / perPage));
    expect(layout.all).toHaveLength(20);
    expect(layout.pages[1]?.[0]?.y).toBe(0);
  });
});

describe("표/들여쓰기 레이아웃", () => {
  it("같은 행의 셀들은 나란히 배치되고 테두리가 생성된다", () => {
    const grid = [100, 100];
    const cellPara = (text: string, col: number) => ({
      runs: [{ text, style: { ...DEFAULT_RUN_STYLE, fontSize: 10 } }],
      style: { ...DEFAULT_PARA_STYLE, lineHeight: 1, spaceAfter: 0 },
      markStyle: { ...DEFAULT_RUN_STYLE, fontSize: 10 },
      cell: { tableId: 0, row: 0, col, span: 1, grid },
    });
    const layout = layoutDocument(
      { paragraphs: [cellPara("ab", 0), cellPara("cd", 1)] },
      fake,
    );
    expect(layout.borders).toHaveLength(2);
    expect(layout.all).toHaveLength(2);
    // 두 셀의 라인은 같은 y, 다른 x
    expect(layout.all[0]?.y).toBe(layout.all[1]?.y);
    expect(layout.all[1]?.x).toBeGreaterThan(layout.all[0]?.x ?? 0);
    expect(layout.borders[1]?.x).toBe(100);
  });

  it("내어쓰기(hanging indent) — 첫 줄만 왼쪽으로 나온다", () => {
    const p = {
      runs: [
        { text: "가나다라마바사아자차", style: { ...DEFAULT_RUN_STYLE, fontSize: 10 } },
      ],
      style: {
        ...DEFAULT_PARA_STYLE,
        lineHeight: 1,
        indentLeft: 15, // 20px
        indentFirstLine: -15, // 첫 줄은 0부터
      },
      markStyle: { ...DEFAULT_RUN_STYLE, fontSize: 10 },
    };
    const lines = layoutParagraph(p, 0, fake, 60);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]?.x).toBe(0);
    expect(lines[1]?.x).toBe(20);
  });
});
