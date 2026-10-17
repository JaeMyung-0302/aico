import { describe, expect, it } from "vitest";
import { docFromText, docText } from "../model/document";
import { DEFAULT_PARA_STYLE, DEFAULT_RUN_STYLE } from "../model/types";
import { Editor } from "./editor";

const make = (text: string): Editor => new Editor(docFromText(text));

describe("Editor 편집", () => {
  it("타이핑 → 캐럿 이동 → 삭제", () => {
    const editor = make("");
    editor.insertText("안녕");
    expect(docText(editor.getState().doc)).toBe("안녕");
    expect(editor.getState().selection.focus).toEqual({ para: 0, offset: 2 });
    editor.deleteBackward();
    expect(docText(editor.getState().doc)).toBe("안");
  });

  it("Enter로 문단 분할, 문단 경계 Backspace로 병합", () => {
    const editor = make("ab");
    editor.setSelection({
      anchor: { para: 0, offset: 1 },
      focus: { para: 0, offset: 1 },
    });
    editor.insertParagraph();
    expect(editor.getState().doc.paragraphs).toHaveLength(2);
    editor.deleteBackward();
    expect(docText(editor.getState().doc)).toBe("ab");
  });

  it("선택 후 입력은 선택을 대체한다", () => {
    const editor = make("abcdef");
    editor.setSelection({
      anchor: { para: 0, offset: 1 },
      focus: { para: 0, offset: 5 },
    });
    editor.insertText("X");
    expect(docText(editor.getState().doc)).toBe("aXf");
  });

  it("연속 타이핑은 undo 한 번으로 되돌린다", () => {
    const editor = make("");
    editor.insertText("a");
    editor.insertText("b");
    editor.insertText("c");
    editor.undo();
    expect(docText(editor.getState().doc)).toBe("");
    editor.redo();
    expect(docText(editor.getState().doc)).toBe("abc");
  });

  it("캐럿 상태 서식은 pendingStyle로 보류 후 다음 입력에 적용된다", () => {
    const editor = make("ab");
    editor.setSelection({
      anchor: { para: 0, offset: 2 },
      focus: { para: 0, offset: 2 },
    });
    editor.toggleStyle("bold");
    expect(editor.currentStyle().bold).toBe(true);
    editor.insertText("c");
    const runs = editor.getState().doc.paragraphs[0]?.runs ?? [];
    expect(runs[runs.length - 1]?.style.bold).toBe(true);
    expect(runs[0]?.style.bold).toBe(false);
  });

  it("IME 조합 — update는 문서를 바꾸지 않고 end에서 확정한다", () => {
    const editor = make("");
    editor.compositionStart();
    editor.compositionUpdate("ㅎ");
    editor.compositionUpdate("하");
    editor.compositionUpdate("한");
    expect(docText(editor.getState().doc)).toBe("");
    expect(docText(editor.displayDoc())).toBe("한");
    editor.compositionEnd("한");
    expect(docText(editor.getState().doc)).toBe("한");
    editor.undo();
    expect(docText(editor.getState().doc)).toBe("");
  });

  it("단어/문단 선택", () => {
    const editor = make("hello world");
    editor.selectWordAt({ para: 0, offset: 7 });
    expect(editor.selectedText()).toBe("world");
    editor.selectParagraphAt({ para: 0, offset: 0 });
    expect(editor.selectedText()).toBe("hello world");
  });

  it("그래핌 단위 이동 — 이모지", () => {
    const editor = make("a👍b");
    editor.moveCaret("docEnd", false);
    editor.moveCaret("left", false);
    editor.moveCaret("left", false);
    expect(editor.getState().selection.focus.offset).toBe(1);
  });
});

describe("리본 확장 명령", () => {
  it("대소문자 바꾸기 — 선택 영역만 변환하고 undo 가능", () => {
    const editor = make("hello world");
    editor.setSelection({
      anchor: { para: 0, offset: 0 },
      focus: { para: 0, offset: 5 },
    });
    editor.transformCase("upper");
    expect(docText(editor.getState().doc)).toBe("HELLO world");
    editor.transformCase("title");
    expect(docText(editor.getState().doc)).toBe("Hello world");
    editor.undo();
    editor.undo();
    expect(docText(editor.getState().doc)).toBe("hello world");
  });

  it("가나다순 정렬 — 캐럿만 있으면 문서 전체", () => {
    const editor = make("다라\n가나\n나다");
    editor.sortParagraphs();
    expect(docText(editor.getState().doc)).toBe("가나\n나다\n다라");
  });

  it("문자 음영 — highlight 토글", () => {
    const editor = make("ab");
    editor.selectAll();
    editor.setRunStyle({ highlight: "#d9d9d9" });
    const runs = editor.getState().doc.paragraphs[0]?.runs ?? [];
    expect(runs[0]?.style.highlight).toBe("#d9d9d9");
  });
});

describe("Enter 문단 기호 상속", () => {
  it("문단 끝 Enter — 새 문단은 직전 텍스트 서식을 따른다 (낡은 markStyle 무시)", () => {
    const editor = new Editor({
      paragraphs: [
        {
          runs: [{ text: "일반 텍스트", style: DEFAULT_RUN_STYLE }],
          style: DEFAULT_PARA_STYLE,
          // 낡은 문단 기호 — 굵게 26pt (샘플 문서/가져오기에서 생기는 상태)
          markStyle: { ...DEFAULT_RUN_STYLE, bold: true, fontSize: 26 },
        },
      ],
    });
    editor.setSelection({
      anchor: { para: 0, offset: 6 },
      focus: { para: 0, offset: 6 },
    });
    editor.insertParagraph();
    // 새 캐럿 위치의 입력 서식 = 직전 텍스트(일반 11pt)
    expect(editor.currentStyle().bold).toBe(false);
    expect(editor.currentStyle().fontSize).toBe(11);
    // 빈 문단의 기호도 11pt → 줄 높이가 정상
    expect(editor.getState().doc.paragraphs[1]?.markStyle.fontSize).toBe(11);
  });
});

describe("Enter와 보류 서식(pendingStyle)", () => {
  it("Bold 해제 직후 Enter를 눌러도 해제 상태가 유지된다", () => {
    const editor = make("");
    editor.toggleStyle("bold");
    editor.insertText("가");
    editor.toggleStyle("bold"); // 해제 (보류)
    editor.insertParagraph();
    expect(editor.currentStyle().bold).toBe(false);
    editor.insertText("나");
    const runs = editor.getState().doc.paragraphs[1]?.runs ?? [];
    expect(runs[0]?.style.bold).toBe(false);
  });
});
