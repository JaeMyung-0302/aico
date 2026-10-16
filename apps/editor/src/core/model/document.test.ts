import { describe, expect, it } from "vitest";
import {
  applyRunStyleToRange,
  deleteRange,
  docFromText,
  docText,
  endOfInsertion,
  insertTextAt,
  normalizeRuns,
  paraAt,
  paraText,
  rangeText,
  sliceRuns,
  splitParagraphAt,
  styleAt,
} from "./document";
import { DEFAULT_PARA_STYLE, DEFAULT_RUN_STYLE } from "./types";

const bold = { ...DEFAULT_RUN_STYLE, bold: true };

describe("normalizeRuns", () => {
  it("빈 run 제거 + 동일 서식 병합", () => {
    const runs = normalizeRuns([
      { text: "ab", style: DEFAULT_RUN_STYLE },
      { text: "", style: bold },
      { text: "cd", style: DEFAULT_RUN_STYLE },
      { text: "ef", style: bold },
    ]);
    expect(runs).toHaveLength(2);
    expect(runs[0]?.text).toBe("abcd");
    expect(runs[1]?.text).toBe("ef");
  });
});

describe("sliceRuns", () => {
  it("run 경계를 걸친 구간 추출", () => {
    const runs = [
      { text: "hello", style: DEFAULT_RUN_STYLE },
      { text: "world", style: bold },
    ];
    const out = sliceRuns(runs, 3, 8);
    expect(out.map((r) => r.text)).toEqual(["lo", "wor"]);
    expect(out[1]?.style.bold).toBe(true);
  });
});

describe("insertTextAt", () => {
  it("문단 중간 삽입", () => {
    const doc = docFromText("안녕하세요");
    const next = insertTextAt(
      doc,
      { para: 0, offset: 2 },
      "XY",
      DEFAULT_RUN_STYLE,
    );
    expect(paraText(paraAt(next, 0))).toBe("안녕XY하세요");
  });

  it("개행 포함 삽입은 문단을 분할한다", () => {
    const doc = docFromText("abcd");
    const next = insertTextAt(
      doc,
      { para: 0, offset: 2 },
      "1\n2",
      DEFAULT_RUN_STYLE,
    );
    expect(next.paragraphs).toHaveLength(2);
    expect(paraText(paraAt(next, 0))).toBe("ab1");
    expect(paraText(paraAt(next, 1))).toBe("2cd");
    expect(endOfInsertion({ para: 0, offset: 2 }, "1\n2")).toEqual({
      para: 1,
      offset: 1,
    });
  });
});

describe("deleteRange", () => {
  it("문단 내 구간 삭제", () => {
    const doc = docFromText("가나다라마");
    const next = deleteRange(doc, {
      anchor: { para: 0, offset: 1 },
      focus: { para: 0, offset: 3 },
    });
    expect(paraText(paraAt(next, 0))).toBe("가라마");
  });

  it("여러 문단에 걸친 삭제는 경계 문단을 병합한다", () => {
    const doc = docFromText("one\ntwo\nthree");
    const next = deleteRange(doc, {
      anchor: { para: 0, offset: 2 },
      focus: { para: 2, offset: 3 },
    });
    expect(next.paragraphs).toHaveLength(1);
    expect(paraText(paraAt(next, 0))).toBe("onee");
  });

  it("anchor/focus 역순도 동일하게 동작", () => {
    const doc = docFromText("abcde");
    const next = deleteRange(doc, {
      anchor: { para: 0, offset: 4 },
      focus: { para: 0, offset: 1 },
    });
    expect(paraText(paraAt(next, 0))).toBe("ae");
  });
});

describe("splitParagraphAt", () => {
  it("Enter 분할", () => {
    const doc = docFromText("가나다");
    const next = splitParagraphAt(doc, { para: 0, offset: 1 });
    expect(next.paragraphs).toHaveLength(2);
    expect(paraText(paraAt(next, 0))).toBe("가");
    expect(paraText(paraAt(next, 1))).toBe("나다");
  });
});

describe("applyRunStyleToRange", () => {
  it("구간에만 서식 적용, run이 분할된다", () => {
    const doc = docFromText("abcdef");
    const next = applyRunStyleToRange(
      doc,
      { anchor: { para: 0, offset: 2 }, focus: { para: 0, offset: 4 } },
      { bold: true },
    );
    const runs = next.paragraphs[0]?.runs ?? [];
    expect(runs.map((r) => r.text)).toEqual(["ab", "cd", "ef"]);
    expect(runs[1]?.style.bold).toBe(true);
    expect(runs[0]?.style.bold).toBe(false);
  });

  it("문단 끝까지 선택하면 markStyle에도 적용된다", () => {
    const doc = docFromText("ab\ncd");
    const next = applyRunStyleToRange(
      doc,
      { anchor: { para: 0, offset: 0 }, focus: { para: 1, offset: 2 } },
      { bold: true },
    );
    expect(next.paragraphs[0]?.markStyle.bold).toBe(true);
    expect(next.paragraphs[1]?.markStyle.bold).toBe(true);
  });
});

describe("styleAt", () => {
  it("캐럿 직전 문자의 서식을 반환한다", () => {
    const doc = {
      paragraphs: [
        {
          runs: [
            { text: "ab", style: DEFAULT_RUN_STYLE },
            { text: "cd", style: bold },
          ],
          style: DEFAULT_PARA_STYLE,
          markStyle: DEFAULT_RUN_STYLE,
        },
      ],
    };
    expect(styleAt(doc, { para: 0, offset: 0 }).bold).toBe(false);
    expect(styleAt(doc, { para: 0, offset: 2 }).bold).toBe(false);
    expect(styleAt(doc, { para: 0, offset: 3 }).bold).toBe(true);
  });
});

describe("rangeText / docText", () => {
  it("여러 문단에 걸친 텍스트 추출", () => {
    const doc = docFromText("one\ntwo\nthree");
    expect(docText(doc)).toBe("one\ntwo\nthree");
    expect(
      rangeText(doc, {
        anchor: { para: 0, offset: 1 },
        focus: { para: 2, offset: 2 },
      }),
    ).toBe("ne\ntwo\nth");
  });
});
