/**
 * 에디터 상태 엔진 — 문서/선택/IME 조합/undo를 관리하는 프레임워크 독립 스토어.
 * React는 subscribe/getState로 구독한다 (useSyncExternalStore 호환).
 */

import type { DocModel, ParagraphStyle, RunStyle } from "../model/types";
import { DEFAULT_RUN_STYLE } from "../model/types";
import {
  applyParaStyleToRange,
  applyRunStyleToRange,
  clampPosition,
  deleteRange,
  docEndPosition,
  docText,
  endOfInsertion,
  insertTextAt,
  paraAt,
  paraLength,
  paraText,
  rangeText,
  sortParagraphRange,
  splitParagraphAt,
  styleAt,
  transformRangeText,
} from "../model/document";
import {
  nextGraphemeBoundary,
  nextWordBoundary,
  prevGraphemeBoundary,
  prevWordBoundary,
  wordRangeAt,
} from "../model/graphemes";
import type { DocPosition, DocRange } from "../model/position";
import { caretAt, isCollapsed, normalizeRange } from "../model/position";
import { History, type Snapshot } from "./history";

export type Composition = { pos: DocPosition; text: string };

export type EditorState = {
  doc: DocModel;
  selection: DocRange;
  composition: Composition | null;
  pendingStyle: Partial<RunStyle> | null;
  version: number;
  canUndo: boolean;
  canRedo: boolean;
  /** 편집 기호(¶) 표시 */
  showMarks: boolean;
  /** 서식 복사 대기 중인 서식 */
  painter: { run: RunStyle; para: ParagraphStyle } | null;
};

export type HorizontalMove =
  "left" | "right" | "wordLeft" | "wordRight" | "docStart" | "docEnd";

export class Editor {
  private history = new History();
  private listeners = new Set<() => void>();
  private state: EditorState;
  /** IME 조합 시작 시점의 스냅샷 (조합 확정 시 히스토리에 올린다) */
  private preComposition: Snapshot | null = null;

  constructor(doc: DocModel) {
    this.state = {
      doc,
      selection: caretAt({ para: 0, offset: 0 }),
      composition: null,
      pendingStyle: null,
      version: 0,
      canUndo: false,
      canRedo: false,
      showMarks: false,
      painter: null,
    };
  }

  getState = (): EditorState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private emit(partial: Partial<EditorState>): void {
    this.state = {
      ...this.state,
      ...partial,
      version: this.state.version + 1,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    };
    this.listeners.forEach((fn) => fn());
  }

  private snapshot(): Snapshot {
    return { doc: this.state.doc, selection: this.state.selection };
  }

  // ── 텍스트 편집 ──────────────────────────────────────

  insertText(text: string): void {
    if (!text) return;
    const { start } = normalizeRange(this.state.selection);
    const style = {
      ...styleAt(this.state.doc, start),
      ...(this.state.pendingStyle ?? {}),
    };
    this.history.push(
      this.snapshot(),
      text.length === 1 && text !== "\n" ? "type" : null,
    );
    let doc = deleteRange(this.state.doc, this.state.selection);
    doc = insertTextAt(doc, start, text, style);
    this.emit({
      doc,
      selection: caretAt(endOfInsertion(start, text)),
      pendingStyle: null,
    });
  }

  insertParagraph(): void {
    const { start } = normalizeRange(this.state.selection);
    this.history.push(this.snapshot(), null);
    let doc = deleteRange(this.state.doc, this.state.selection);
    doc = splitParagraphAt(doc, start);
    this.emit({
      doc,
      selection: caretAt({ para: start.para + 1, offset: 0 }),
      // 토글만 하고 아직 입력하지 않은 서식(예: Bold 해제)은 Enter 후에도 유지
      pendingStyle: this.state.pendingStyle,
    });
  }

  deleteBackward(): void {
    const { doc, selection } = this.state;
    if (!isCollapsed(selection)) {
      this.deleteSelection("delete");
      return;
    }
    const pos = selection.focus;
    let target: DocPosition;
    if (pos.offset > 0) {
      target = {
        para: pos.para,
        offset: prevGraphemeBoundary(
          paraText(paraAt(doc, pos.para)),
          pos.offset,
        ),
      };
    } else if (pos.para > 0) {
      target = {
        para: pos.para - 1,
        offset: paraLength(paraAt(doc, pos.para - 1)),
      };
    } else {
      return;
    }
    this.history.push(this.snapshot(), "delete");
    this.emit({
      doc: deleteRange(doc, { anchor: target, focus: pos }),
      selection: caretAt(target),
      pendingStyle: null,
    });
  }

  deleteForward(): void {
    const { doc, selection } = this.state;
    if (!isCollapsed(selection)) {
      this.deleteSelection("delete");
      return;
    }
    const pos = selection.focus;
    const len = paraLength(paraAt(doc, pos.para));
    let target: DocPosition;
    if (pos.offset < len) {
      target = {
        para: pos.para,
        offset: nextGraphemeBoundary(
          paraText(paraAt(doc, pos.para)),
          pos.offset,
        ),
      };
    } else if (pos.para < doc.paragraphs.length - 1) {
      target = { para: pos.para + 1, offset: 0 };
    } else {
      return;
    }
    this.history.push(this.snapshot(), "delete");
    this.emit({
      doc: deleteRange(doc, { anchor: pos, focus: target }),
      selection: caretAt(pos),
      pendingStyle: null,
    });
  }

  private deleteSelection(group: string | null): void {
    const { start } = normalizeRange(this.state.selection);
    this.history.push(this.snapshot(), group);
    this.emit({
      doc: deleteRange(this.state.doc, this.state.selection),
      selection: caretAt(start),
      pendingStyle: null,
    });
  }

  // ── 선택/이동 ──────────────────────────────────────

  setSelection(range: DocRange, keepPending = false): void {
    const selection = {
      anchor: clampPosition(this.state.doc, range.anchor),
      focus: clampPosition(this.state.doc, range.focus),
    };
    this.emit({
      selection,
      pendingStyle: keepPending ? this.state.pendingStyle : null,
    });
  }

  moveCaret(move: HorizontalMove, extend: boolean): void {
    const { doc, selection } = this.state;
    // Word 방식: 선택이 있을 때 좌/우는 선택의 시작/끝으로 접는다
    if (
      !extend &&
      !isCollapsed(selection) &&
      (move === "left" || move === "right")
    ) {
      const { start, end } = normalizeRange(selection);
      this.setSelection(caretAt(move === "left" ? start : end));
      return;
    }
    const pos = selection.focus;
    const text = paraText(paraAt(doc, pos.para));
    let next: DocPosition = pos;
    if (move === "docStart") next = { para: 0, offset: 0 };
    else if (move === "docEnd") next = docEndPosition(doc);
    else if (move === "left" || move === "wordLeft") {
      if (pos.offset > 0) {
        const boundary =
          move === "left" ? prevGraphemeBoundary : prevWordBoundary;
        next = { para: pos.para, offset: boundary(text, pos.offset) };
      } else if (pos.para > 0) {
        next = {
          para: pos.para - 1,
          offset: paraLength(paraAt(doc, pos.para - 1)),
        };
      }
    } else {
      if (pos.offset < text.length) {
        const boundary =
          move === "right" ? nextGraphemeBoundary : nextWordBoundary;
        next = { para: pos.para, offset: boundary(text, pos.offset) };
      } else if (pos.para < doc.paragraphs.length - 1) {
        next = { para: pos.para + 1, offset: 0 };
      }
    }
    this.setSelection(
      extend ? { anchor: selection.anchor, focus: next } : caretAt(next),
    );
  }

  selectAll(): void {
    this.setSelection({
      anchor: { para: 0, offset: 0 },
      focus: docEndPosition(this.state.doc),
    });
  }

  selectWordAt(pos: DocPosition): void {
    const clamped = clampPosition(this.state.doc, pos);
    const { start, end } = wordRangeAt(
      paraText(paraAt(this.state.doc, clamped.para)),
      clamped.offset,
    );
    this.setSelection({
      anchor: { para: clamped.para, offset: start },
      focus: { para: clamped.para, offset: end },
    });
  }

  selectParagraphAt(pos: DocPosition): void {
    const clamped = clampPosition(this.state.doc, pos);
    this.setSelection({
      anchor: { para: clamped.para, offset: 0 },
      focus: {
        para: clamped.para,
        offset: paraLength(paraAt(this.state.doc, clamped.para)),
      },
    });
  }

  // ── 서식 ──────────────────────────────────────

  currentStyle(): RunStyle {
    const { start } = normalizeRange(this.state.selection);
    return {
      ...styleAt(this.state.doc, start),
      ...(this.state.pendingStyle ?? {}),
    };
  }

  currentParaStyle(): ParagraphStyle {
    return paraAt(this.state.doc, this.state.selection.focus.para).style;
  }

  toggleStyle(key: "bold" | "italic" | "underline" | "strike"): void {
    this.setRunStyle({ [key]: !this.currentStyle()[key] });
  }

  setRunStyle(patch: Partial<RunStyle>): void {
    if (isCollapsed(this.state.selection)) {
      // 캐럿 상태 — 다음 입력에 적용될 서식으로 보류
      this.emit({
        pendingStyle: { ...(this.state.pendingStyle ?? {}), ...patch },
      });
      return;
    }
    this.history.push(this.snapshot(), null);
    this.emit({
      doc: applyRunStyleToRange(this.state.doc, this.state.selection, patch),
    });
  }

  setParaStyle(patch: Partial<ParagraphStyle>): void {
    this.history.push(this.snapshot(), null);
    this.emit({
      doc: applyParaStyleToRange(this.state.doc, this.state.selection, patch),
    });
  }

  // ── 리본 명령 ──────────────────────────────────────

  /** 글자 크기 한 단계 크게/작게 (Word 크기 단계) */
  adjustFontSize(dir: 1 | -1): void {
    const steps = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
    const cur = this.currentStyle().fontSize;
    const idx = steps.findIndex((s) => s >= cur);
    const next =
      dir > 0
        ? steps[
            Math.min(
              steps.length - 1,
              (idx < 0 ? steps.length - 1 : idx) + (steps[idx] === cur ? 1 : 0),
            )
          ]
        : steps[Math.max(0, (idx < 0 ? steps.length : idx) - 1)];
    if (next && next !== cur) this.setRunStyle({ fontSize: next });
  }

  /** 서식 지우기 — 선택 영역을 기본 서식으로 */
  clearFormatting(): void {
    const {
      fontFamily,
      fontSize,
      bold,
      italic,
      underline,
      strike,
      color,
      highlight,
      verticalAlign,
    } = DEFAULT_RUN_STYLE;
    this.setRunStyle({
      fontFamily,
      fontSize,
      bold,
      italic,
      underline,
      strike,
      color,
      highlight,
      verticalAlign,
    });
  }

  /** 위/아래 첨자 토글 (상호 배타) */
  toggleVerticalAlign(kind: "super" | "sub"): void {
    const cur = this.currentStyle().verticalAlign;
    this.setRunStyle({ verticalAlign: cur === kind ? "baseline" : kind });
  }

  /** 글머리 기호/번호 매기기 토글 */
  toggleList(kind: "bullet" | "number"): void {
    const cur = this.currentParaStyle().list;
    this.setParaStyle({ list: cur === kind ? "none" : kind });
  }

  /** 들여쓰기 늘리기/줄이기 (18pt 단위) */
  adjustIndent(dir: 1 | -1): void {
    const cur = this.currentParaStyle().indentLeft;
    this.setParaStyle({ indentLeft: Math.max(0, cur + dir * 18) });
  }

  toggleMarks(): void {
    this.emit({ showMarks: !this.state.showMarks });
  }

  /** 서식 복사 시작 — 현재 서식을 기억해 두고 다음 선택에 적용 */
  startPainter(): void {
    if (this.state.painter) {
      this.emit({ painter: null });
      return;
    }
    this.emit({
      painter: { run: this.currentStyle(), para: this.currentParaStyle() },
    });
  }

  /** 선택이 완료됐을 때 서식 복사 적용 (뷰가 mouseup에서 호출) */
  applyPainterIfActive(): void {
    const painter = this.state.painter;
    if (!painter || isCollapsed(this.state.selection)) return;
    this.history.push(this.snapshot(), null);
    let doc = applyRunStyleToRange(
      this.state.doc,
      this.state.selection,
      painter.run,
    );
    doc = applyParaStyleToRange(doc, this.state.selection, {
      align: painter.para.align,
      lineHeight: painter.para.lineHeight,
      indentLeft: painter.para.indentLeft,
      indentFirstLine: painter.para.indentFirstLine,
      list: painter.para.list,
    });
    this.emit({ doc, painter: null });
  }

  /** 대소문자/전각 바꾸기 — 캐럿만 있으면 현재 단어에 적용 */
  transformCase(
    kind: "upper" | "lower" | "title" | "sentence" | "toggle" | "half" | "full",
  ): void {
    let range = this.state.selection;
    if (isCollapsed(range)) {
      const pos = range.focus;
      const { start, end } = wordRangeAt(
        paraText(paraAt(this.state.doc, pos.para)),
        pos.offset,
      );
      range = {
        anchor: { para: pos.para, offset: start },
        focus: { para: pos.para, offset: end },
      };
    }
    const fns: Record<typeof kind, (s: string) => string> = {
      upper: (s) => s.toUpperCase(),
      lower: (s) => s.toLowerCase(),
      title: (s) =>
        s.replace(
          /\S+/g,
          (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        ),
      sentence: (s) =>
        s
          .toLowerCase()
          .replace(
            /(^|[.!?]\s+)(\p{Ll})/gu,
            (m, p, c: string) => String(p) + c.toUpperCase(),
          ),
      toggle: (s) =>
        [...s]
          .map((c) =>
            c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(),
          )
          .join(""),
      // 반자로 — 전각 문자를 반각으로
      half: (s) =>
        [...s]
          .map((c) => {
            const cp = c.codePointAt(0) ?? 0;
            if (cp === 0x3000) return " ";
            if (cp >= 0xff01 && cp <= 0xff5e)
              return String.fromCodePoint(cp - 0xfee0);
            return c;
          })
          .join(""),
      // 전자로 — 반각 ASCII를 전각으로
      full: (s) =>
        [...s]
          .map((c) => {
            const cp = c.codePointAt(0) ?? 0;
            if (cp === 0x20) return "　";
            if (cp >= 0x21 && cp <= 0x7e)
              return String.fromCodePoint(cp + 0xfee0);
            return c;
          })
          .join(""),
    };
    const fn = fns[kind];
    this.history.push(this.snapshot(), null);
    this.emit({ doc: transformRangeText(this.state.doc, range, fn) });
  }

  /** 선택 문단들을 가나다순 정렬 (캐럿만 있으면 문서 전체) */
  sortParagraphs(): void {
    const { doc, selection } = this.state;
    const { start, end } = normalizeRange(selection);
    const [from, to] = isCollapsed(selection)
      ? [0, doc.paragraphs.length - 1]
      : [start.para, end.para];
    const next = sortParagraphRange(doc, from, to);
    if (next === doc) return;
    this.history.push(this.snapshot(), null);
    this.emit({ doc: next, selection: caretAt({ para: from, offset: 0 }) });
  }

  /** 스타일 갤러리 프리셋 적용 — 캐럿만 있으면 현재 문단 전체에 적용 (Word 방식) */
  applyStylePreset(
    run: Partial<RunStyle>,
    para: Partial<ParagraphStyle>,
  ): void {
    const sel = this.state.selection;
    const range = isCollapsed(sel)
      ? {
          anchor: { para: sel.focus.para, offset: 0 },
          focus: {
            para: sel.focus.para,
            offset: paraLength(paraAt(this.state.doc, sel.focus.para)),
          },
        }
      : sel;
    this.history.push(this.snapshot(), null);
    let doc = applyRunStyleToRange(this.state.doc, range, run);
    doc = applyParaStyleToRange(doc, range, para);
    this.emit({ doc });
  }

  /** 다음 일치 항목 찾기 (현재 위치 이후, 끝나면 처음부터) */
  findNext(query: string): boolean {
    if (!query) return false;
    const { doc } = this.state;
    const from = normalizeRange(this.state.selection).end;
    const search = (
      startPara: number,
      startOffset: number,
    ): DocPosition | null => {
      for (let i = startPara; i < doc.paragraphs.length; i++) {
        const text = paraText(paraAt(doc, i));
        const idx = text.indexOf(query, i === startPara ? startOffset : 0);
        if (idx >= 0) return { para: i, offset: idx };
      }
      return null;
    };
    const hit = search(from.para, from.offset) ?? search(0, 0);
    if (!hit) return false;
    this.setSelection({
      anchor: hit,
      focus: { para: hit.para, offset: hit.offset + query.length },
    });
    return true;
  }

  /** 파일 열기 등 문서 전체 교체 — 히스토리를 초기화한다 */
  setDocument(doc: DocModel): void {
    this.history = new History();
    this.preComposition = null;
    this.emit({
      doc,
      selection: caretAt({ para: 0, offset: 0 }),
      composition: null,
      pendingStyle: null,
    });
  }

  // ── undo/redo ──────────────────────────────────────

  undo(): void {
    const snap = this.history.undo(this.snapshot());
    if (!snap) return;
    this.emit({ ...snap, composition: null, pendingStyle: null });
  }

  redo(): void {
    const snap = this.history.redo(this.snapshot());
    if (!snap) return;
    this.emit({ ...snap, composition: null, pendingStyle: null });
  }

  // ── IME 조합 ──────────────────────────────────────

  compositionStart(): void {
    this.preComposition = this.snapshot();
    if (!isCollapsed(this.state.selection)) {
      const { start } = normalizeRange(this.state.selection);
      this.emit({
        doc: deleteRange(this.state.doc, this.state.selection),
        selection: caretAt(start),
      });
    }
  }

  compositionUpdate(text: string): void {
    const { start } = normalizeRange(this.state.selection);
    this.emit({ composition: text ? { pos: start, text } : null });
  }

  compositionEnd(text: string): void {
    const pre = this.preComposition;
    this.preComposition = null;
    const { start } = normalizeRange(this.state.selection);
    if (!text) {
      // 조합 취소 — 선택 삭제가 있었다면 그것만 확정
      const changed = pre && pre.doc !== this.state.doc;
      if (changed && pre) this.history.push(pre, null);
      this.emit({ composition: null });
      return;
    }
    if (pre) this.history.push(pre, null);
    const style = {
      ...styleAt(this.state.doc, start),
      ...(this.state.pendingStyle ?? {}),
    };
    this.emit({
      doc: insertTextAt(this.state.doc, start, text, style),
      selection: caretAt(endOfInsertion(start, text)),
      composition: null,
      pendingStyle: null,
    });
  }

  /** 조합 중 텍스트가 반영된 표시용 문서 */
  displayDoc(): DocModel {
    const { doc, composition } = this.state;
    if (!composition) return doc;
    const style = {
      ...styleAt(doc, composition.pos),
      ...(this.state.pendingStyle ?? {}),
    };
    return insertTextAt(doc, composition.pos, composition.text, style);
  }

  /** 표시용 캐럿 위치 (조합 중이면 조합 끝) */
  displayCaret(): DocPosition {
    const { composition } = this.state;
    if (composition) return endOfInsertion(composition.pos, composition.text);
    return this.state.selection.focus;
  }

  /** 조합 중 텍스트 범위 (밑줄 표시용) */
  compositionRange(): DocRange | null {
    const { composition } = this.state;
    if (!composition) return null;
    return {
      anchor: composition.pos,
      focus: endOfInsertion(composition.pos, composition.text),
    };
  }

  // ── 기타 ──────────────────────────────────────

  selectedText(): string {
    return rangeText(this.state.doc, this.state.selection);
  }

  stats(): { chars: number; words: number } {
    const text = docText(this.state.doc);
    const words = text.split(/\s+/).filter((w) => w.length > 0).length;
    return { chars: text.replace(/\n/g, "").length, words };
  }
}
