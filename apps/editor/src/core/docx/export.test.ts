import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { DEFAULT_PARA_STYLE, DEFAULT_RUN_STYLE } from "../model/types";
import { buildDocumentXml, exportDocx } from "./export";

const doc = {
  paragraphs: [
    {
      runs: [
        {
          text: "제목 <&> 테스트",
          style: { ...DEFAULT_RUN_STYLE, bold: true, fontSize: 26 },
        },
      ],
      style: { ...DEFAULT_PARA_STYLE, align: "center" as const },
      markStyle: DEFAULT_RUN_STYLE,
    },
    {
      runs: [
        { text: "본문 ", style: DEFAULT_RUN_STYLE },
        {
          text: "밑줄",
          style: { ...DEFAULT_RUN_STYLE, underline: true, color: "#c2410c" },
        },
      ],
      style: { ...DEFAULT_PARA_STYLE, align: "justify" as const },
      markStyle: DEFAULT_RUN_STYLE,
    },
  ],
};

describe("buildDocumentXml", () => {
  it("서식/정렬이 OOXML로 매핑되고 특수문자가 이스케이프된다", () => {
    const xml = buildDocumentXml(doc);
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('<w:jc w:val="both"/>');
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain('<w:u w:val="single"/>');
    expect(xml).toContain('<w:sz w:val="52"/>'); // 26pt = 52 half-points
    expect(xml).toContain('<w:color w:val="C2410C"/>');
    expect(xml).toContain("제목 &lt;&amp;&gt; 테스트");
    expect(xml).not.toContain("<&>");
  });
});

describe("exportDocx", () => {
  it("zip 패키지에 필수 파트가 들어있다", () => {
    const files = unzipSync(exportDocx(doc));
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "[Content_Types].xml",
        "_rels/.rels",
        "word/document.xml",
      ]),
    );
    const entry = files["word/document.xml"];
    expect(entry).toBeDefined();
    expect(strFromU8(entry ?? new Uint8Array())).toBe(buildDocumentXml(doc));
  });
});

describe("단락 확장 서식 내보내기", () => {
  it("음영/테두리/균등 분할이 pPr에 기록된다", () => {
    const xml = buildDocumentXml({
      paragraphs: [
        {
          runs: [{ text: "가", style: DEFAULT_RUN_STYLE }],
          style: {
            ...DEFAULT_PARA_STYLE,
            align: "distribute" as const,
            shading: "#fff2cc",
            borders: { top: true, right: true, bottom: true, left: true },
          },
          markStyle: DEFAULT_RUN_STYLE,
        },
      ],
    });
    expect(xml).toContain('<w:jc w:val="distribute"/>');
    expect(xml).toContain('w:fill="FFF2CC"');
    expect(xml).toContain("<w:pBdr>");
  });
});
