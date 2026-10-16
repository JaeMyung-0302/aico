/**
 * canvas 기반 문서 뷰 — 페이지 렌더링, 캐럿/선택 표시, 마우스/키보드/IME 입력을 담당한다.
 * 실제 텍스트 입력은 캐럿 위치에 붙어 다니는 숨은 textarea가 받는다 (한글 IME 후보창 위치 보정).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from "react";
import classNames from "classnames/bind";
import type { Editor } from "@/core/editor/editor";
import { caretAt } from "@/core/model/position";
import { isCollapsed } from "@/core/model/position";
import { PAGE_HEIGHT, PAGE_WIDTH, PT_TO_PX } from "@/core/layout/constants";
import { createCanvasMeasurer } from "@/core/layout/metrics";
import { layoutDocument } from "@/core/layout/layout";
import {
  caretRectOf,
  lineIndexOfPos,
  posAtLineX,
  posAtPoint,
  xAtOffset,
} from "@/core/layout/hit-test";
import { rangeRects, renderPage } from "@/core/render/renderer";
import type { DocPosition } from "@/core/model/position";
import styles from "./EditorCanvas.module.scss";

const cx = classNames.bind(styles);

type Props = {
  editor: Editor;
  zoom: number;
  /** 부모가 에디터에 포커스를 줄 수 있도록 focus 함수를 노출 */
  focusRef?: MutableRefObject<(() => void) | null>;
  onLayoutInfo?: (info: { pageCount: number; caretPage: number }) => void;
};

const EditorCanvas = ({ editor, zoom, focusRef, onLayoutInfo }: Props) => {
  const state = useSyncExternalStore(editor.subscribe, editor.getState);
  const measurer = useMemo(() => createCanvasMeasurer(), []);
  // state.version이 문서 변경을 대표한다 — displayDoc()은 호출마다 새 객체일 수 있음
  const layout = useMemo(
    () => layoutDocument(editor.displayDoc(), measurer),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- state.version으로 재계산 제어
    [state.version, measurer, editor],
  );

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const caretElRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);
  const draggingRef = useRef(false);
  const anchorRef = useRef<DocPosition | null>(null);
  const goalXRef = useRef<number | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const collapsed = isCollapsed(state.selection);
  const selRects = useMemo(
    () =>
      collapsed || state.composition
        ? []
        : rangeRects(layout, state.selection, measurer),
    [layout, state.selection, state.composition, collapsed, measurer],
  );
  const compRange = editor.compositionRange();
  const compRects = useMemo(
    () => (compRange ? rangeRects(layout, compRange, measurer) : []),
    [layout, compRange, measurer],
  );
  const caret = caretRectOf(layout, editor.displayCaret(), measurer);

  // 페이지 캔버스 렌더링
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    layout.pages.forEach((_, i) => {
      const canvas = canvasRefs.current[i];
      if (canvas)
        renderPage(canvas, layout, i, {
          dpr,
          zoom,
          selection: selRects,
          composition: compRects,
          showMarks: state.showMarks,
        });
    });
  }, [layout, selRects, compRects, zoom, state.showMarks]);

  // 캐럿(포커스 위치) 화면 안으로 스크롤 — textarea가 항상 포커스 위치에 있다
  useEffect(() => {
    (caretElRef.current ?? textareaRef.current)?.scrollIntoView({
      block: "nearest",
    });
  }, [state.version]);

  useEffect(() => {
    if (focusRef) focusRef.current = () => textareaRef.current?.focus();
  }, [focusRef]);

  useEffect(() => {
    onLayoutInfo?.({
      pageCount: layout.pages.length,
      caretPage: (caret?.page ?? 0) + 1,
    });
  }, [layout, caret?.page, onLayoutInfo]);

  // 드래그 선택 — window 레벨에서 추적
  useEffect(() => {
    const posFromClient = (
      clientX: number,
      clientY: number,
    ): DocPosition | null => {
      let best: { page: number; x: number; y: number } | null = null;
      canvasRefs.current.forEach((canvas, page) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const inX = Math.max(rect.left, Math.min(clientX, rect.right));
        const clampedY = Math.max(rect.top, Math.min(clientY, rect.bottom));
        if (
          best === null ||
          Math.abs(clientY - clampedY) < Math.abs(clientY - (best.y + 1))
        ) {
          best = {
            page,
            x: (inX - rect.left) / zoom - layoutRef.current.margin.left,
            y: (clampedY - rect.top) / zoom - layoutRef.current.margin.top,
          };
        }
      });
      if (!best) return null;
      const b = best as { page: number; x: number; y: number };
      return posAtPoint(layoutRef.current, b.page, b.x, b.y, measurer);
    };
    const onMove = (e: MouseEvent): void => {
      if (!draggingRef.current || !anchorRef.current) return;
      const pos = posFromClient(e.clientX, e.clientY);
      if (pos) editor.setSelection({ anchor: anchorRef.current, focus: pos });
    };
    const onUp = (): void => {
      if (draggingRef.current) editor.applyPainterIfActive();
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [editor, measurer, zoom]);

  const posFromPageEvent = (
    e: ReactMouseEvent,
    page: number,
  ): DocPosition | null => {
    const canvas = canvasRefs.current[page];
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - layoutRef.current.margin.left;
    const y = (e.clientY - rect.top) / zoom - layoutRef.current.margin.top;
    return posAtPoint(layout, page, x, y, measurer);
  };

  const handleMouseDown = (e: ReactMouseEvent, page: number): void => {
    e.preventDefault(); // textarea 포커스 유지
    textareaRef.current?.focus();
    const pos = posFromPageEvent(e, page);
    if (!pos) return;
    goalXRef.current = null;
    if (e.detail >= 3) {
      editor.selectParagraphAt(pos);
      return;
    }
    if (e.detail === 2) {
      editor.selectWordAt(pos);
      return;
    }
    if (e.shiftKey) {
      editor.setSelection({ anchor: state.selection.anchor, focus: pos });
      anchorRef.current = state.selection.anchor;
    } else {
      editor.setSelection(caretAt(pos));
      anchorRef.current = pos;
    }
    draggingRef.current = true;
  };

  const moveVertical = (dir: 1 | -1, extend: boolean): void => {
    const pos = editor.displayCaret();
    const li = lineIndexOfPos(layout, pos);
    const curLine = layout.all[li];
    if (li < 0 || !curLine) return;
    const x = goalXRef.current ?? xAtOffset(curLine, pos.offset, measurer);
    goalXRef.current = x;
    const target = li + dir;
    let next: DocPosition;
    if (target < 0) next = { para: 0, offset: 0 };
    else if (target >= layout.all.length) {
      const lastLine = layout.all[layout.all.length - 1];
      if (!lastLine) return;
      next = { para: lastLine.para, offset: lastLine.end };
    } else next = posAtLineX(layout, target, x, measurer);
    editor.setSelection(
      extend ? { anchor: state.selection.anchor, focus: next } : caretAt(next),
    );
  };

  const moveToLineEdge = (edge: "start" | "end", extend: boolean): void => {
    const pos = editor.displayCaret();
    const li = lineIndexOfPos(layout, pos);
    const line = layout.all[li];
    if (li < 0 || !line) return;
    const next = {
      para: line.para,
      offset: edge === "start" ? line.start : line.end,
    };
    editor.setSelection(
      extend ? { anchor: state.selection.anchor, focus: next } : caretAt(next),
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.nativeEvent.isComposing || composingRef.current) return;
    const mod = e.metaKey || e.ctrlKey;
    const extend = e.shiftKey;
    const vertical = e.key === "ArrowUp" || e.key === "ArrowDown";
    if (!vertical) goalXRef.current = null;

    if (mod) {
      const key = e.key.toLowerCase();
      if (key === "a") {
        e.preventDefault();
        editor.selectAll();
        return;
      }
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (key === "y") {
        e.preventDefault();
        editor.redo();
        return;
      }
      if (key === "b" || key === "i" || key === "u") {
        e.preventDefault();
        editor.toggleStyle(
          key === "b" ? "bold" : key === "i" ? "italic" : "underline",
        );
        return;
      }
      if (key === "c" || key === "x") {
        e.preventDefault();
        const text = editor.selectedText();
        if (text) void navigator.clipboard.writeText(text);
        if (key === "x" && text) editor.deleteBackward();
        return;
      }
      if (key === "v") return; // textarea paste 이벤트에서 처리
    }

    switch (e.key) {
      case "Backspace":
        e.preventDefault();
        editor.deleteBackward();
        return;
      case "Delete":
        e.preventDefault();
        editor.deleteForward();
        return;
      case "Enter":
        e.preventDefault();
        editor.insertParagraph();
        return;
      case "Tab":
        e.preventDefault();
        editor.insertText("    ");
        return;
      case "ArrowLeft":
      case "ArrowRight": {
        e.preventDefault();
        const dir = e.key === "ArrowLeft" ? "left" : "right";
        if (e.metaKey) moveToLineEdge(dir === "left" ? "start" : "end", extend);
        else if (e.altKey || e.ctrlKey)
          editor.moveCaret(dir === "left" ? "wordLeft" : "wordRight", extend);
        else editor.moveCaret(dir, extend);
        return;
      }
      case "ArrowUp":
      case "ArrowDown":
        e.preventDefault();
        if (e.metaKey)
          editor.moveCaret(e.key === "ArrowUp" ? "docStart" : "docEnd", extend);
        else moveVertical(e.key === "ArrowUp" ? -1 : 1, extend);
        return;
      case "Home":
        e.preventDefault();
        moveToLineEdge("start", extend);
        return;
      case "End":
        e.preventDefault();
        moveToLineEdge("end", extend);
        return;
    }
  };

  const clearTextarea = (): void => {
    if (textareaRef.current) textareaRef.current.value = "";
  };

  const caretHeightPx = caret ? caret.height * zoom : 16;
  const caretStyle = caret
    ? {
        left: (layout.margin.left + caret.x) * zoom,
        top: (layout.margin.top + caret.y) * zoom,
        height: caretHeightPx,
      }
    : undefined;

  return (
    <div
      className={cx("workspace")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          textareaRef.current?.focus();
        }
      }}
      role="presentation"
    >
      {layout.pages.map((_, i) => (
        <div
          key={i}
          className={cx("page")}
          style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
          onMouseDown={(e) => handleMouseDown(e, i)}
          role="presentation"
        >
          <canvas
            ref={(el) => {
              canvasRefs.current[i] = el;
            }}
            style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
          />
          {caret && caret.page === i && (
            <>
              {collapsed && (
                <div
                  ref={caretElRef}
                  className={cx("caret")}
                  style={caretStyle}
                />
              )}
              <textarea
                ref={textareaRef}
                className={cx("hiddenInput")}
                style={{
                  ...caretStyle,
                  fontSize: editor.currentStyle().fontSize * PT_TO_PX * zoom,
                }}
                onKeyDown={handleKeyDown}
                onInput={(e) => {
                  if (composingRef.current) return;
                  const value = e.currentTarget.value;
                  if (value) {
                    editor.insertText(value);
                    clearTextarea();
                  }
                }}
                onCompositionStart={() => {
                  composingRef.current = true;
                  editor.compositionStart();
                }}
                onCompositionUpdate={(e) =>
                  editor.compositionUpdate(e.data ?? "")
                }
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  editor.compositionEnd(e.data ?? "");
                  clearTextarea();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData("text/plain");
                  if (text) editor.insertText(text);
                }}
                autoFocus
                spellCheck={false}
                aria-label="문서 편집 입력"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default EditorCanvas;
