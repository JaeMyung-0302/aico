/**
 * MS Word 스타일 리본 — 제목 표시줄(빠른 실행) + 탭 + 홈 리본.
 * 홈 탭의 컨트롤은 전부 에디터 엔진 명령에 연결되어 실제로 동작한다.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import classNames from "classnames/bind";
import {
  ArrowRedo20Regular,
  ArrowUndo20Regular,
  BorderAll20Regular,
  ChevronDown12Regular,
  ClipboardPaste24Regular,
  ColorFill20Regular,
  Copy20Regular,
  Cut20Regular,
  FolderOpen20Regular,
  FontDecrease20Regular,
  FontIncrease20Regular,
  Highlight20Regular,
  PaintBrush20Regular,
  Save20Regular,
  Search16Regular,
  TextAlignCenter20Regular,
  TextAlignDistributedEvenly20Regular,
  TextAlignJustify20Regular,
  TextAlignLeft20Regular,
  TextAlignRight20Regular,
  TextBulletListLtr20Regular,
  TextBulletListTree20Regular,
  TextChangeCase20Regular,
  TextClearFormatting20Regular,
  TextIndentDecrease20Regular,
  TextIndentIncrease20Regular,
  TextLineSpacing20Regular,
  TextNumberListLtr20Regular,
  TextParagraph20Regular,
  TextSortAscending20Regular,
  TextSubscript20Regular,
  TextSuperscript20Regular,
} from "@fluentui/react-icons";
import type { Editor } from "@/core/editor/editor";
import type {
  Alignment,
  ParagraphStyle,
  RunStyle,
  UnderlineStyle,
} from "@/core/model/types";
import { exportDocx } from "@/core/docx/export";
import { importDocx } from "@/core/docx/import";
import styles from "./Ribbon.module.scss";

const cx = classNames.bind(styles);

const FONTS = [
  {
    label: "시스템 고딕",
    value: 'system-ui, "Apple SD Gothic Neo", sans-serif',
  },
  { label: "세리프 (명조)", value: 'Georgia, "Apple Myungjo", serif' },
  { label: "고정폭", value: '"Courier New", monospace' },
  { label: "Apple SD 산돌고딕 Neo", value: '"Apple SD Gothic Neo", sans-serif' },
  { label: "애플 명조", value: '"AppleMyungjo", serif' },
  { label: "나눔고딕", value: '"NanumGothic", "Nanum Gothic", sans-serif' },
  { label: "Noto Sans KR", value: '"Noto Sans KR", sans-serif' },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica Neue", value: '"Helvetica Neue", Helvetica, sans-serif' },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Menlo", value: "Menlo, monospace" },
];

const SIZES = [
  5, 5.5, 6.5, 7.5, 8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36,
  48, 72,
];

const HIGHLIGHTS = [
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#ff00ff",
  "#0000ff",
  "#ff0000",
  "#000080",
  "#008080",
  "#008000",
  "#800080",
  "#800000",
  "#808000",
  "#808080",
  "#c0c0c0",
  "#000000",
];

/** 테마 색 10열 (기본 + 밝기 변형 4단) */
const THEME_BASE = [
  "#ffffff",
  "#000000",
  "#e7e6e6",
  "#44546a",
  "#4472c4",
  "#ed7d31",
  "#a5a5a5",
  "#70ad47",
  "#264478",
  "#9e480e",
];
const mixHex = (hex: string, target: number, ratio: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number): string => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (target - c) * ratio)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** 각 테마 색의 5단 변형 (틴트 3 + 셰이드 2) */
const themeShades = (base: string): string[] => [
  mixHex(base, 255, 0.8),
  mixHex(base, 255, 0.6),
  mixHex(base, 255, 0.4),
  mixHex(base, 0, 0.25),
  mixHex(base, 0, 0.5),
];
const STANDARD_COLORS = [
  "#c00000",
  "#ff0000",
  "#ffc000",
  "#ffff00",
  "#92d050",
  "#00b050",
  "#00b0f0",
  "#0070c0",
  "#002060",
  "#7030a0",
];

const UNDERLINE_STYLES: { key: string; css: string }[] = [
  { key: "single", css: "solid1" },
  { key: "double", css: "double" },
  { key: "thick", css: "solid3" },
  { key: "dotted", css: "dotted" },
  { key: "dash", css: "dashed" },
  { key: "dotDash", css: "dashed" },
  { key: "dotDotDash", css: "dotted" },
  { key: "wave", css: "wave" },
];

const ALIGNS: { key: Alignment; label: React.ReactNode; title: string }[] = [
  { key: "left", label: <TextAlignLeft20Regular />, title: "왼쪽 맞춤 (⌘L)" },
  {
    key: "center",
    label: <TextAlignCenter20Regular />,
    title: "가운데 맞춤 (⌘E)",
  },
  {
    key: "right",
    label: <TextAlignRight20Regular />,
    title: "오른쪽 맞춤 (⌘R)",
  },
  {
    key: "justify",
    label: <TextAlignJustify20Regular />,
    title: "양쪽 맞춤 (⌘J)",
  },
  {
    key: "distribute",
    label: <TextAlignDistributedEvenly20Regular />,
    title: "균등 분할",
  },
];

type Preset = {
  name: string;
  run: Partial<RunStyle>;
  para: Partial<ParagraphStyle>;
};

const STYLE_PRESETS: Preset[] = [
  {
    name: "표준",
    run: { fontSize: 11, bold: false, italic: false, color: "#1f1f1f" },
    para: { spaceBefore: 0, spaceAfter: 8, lineHeight: 1.15, list: "none" },
  },
  {
    name: "간격 없음",
    run: { fontSize: 11, bold: false, italic: false, color: "#1f1f1f" },
    para: { spaceBefore: 0, spaceAfter: 0, lineHeight: 1, list: "none" },
  },
  {
    name: "제목 1",
    run: { fontSize: 16, bold: false, italic: false, color: "#2f5496" },
    para: { spaceBefore: 12, spaceAfter: 4, lineHeight: 1.15, list: "none" },
  },
  {
    name: "제목 2",
    run: { fontSize: 13, bold: false, italic: false, color: "#2f5496" },
    para: { spaceBefore: 8, spaceAfter: 4, lineHeight: 1.15, list: "none" },
  },
  {
    name: "제목",
    run: { fontSize: 28, bold: false, italic: false, color: "#1f1f1f" },
    para: { spaceBefore: 0, spaceAfter: 4, lineHeight: 1.15, list: "none" },
  },
  {
    name: "부제",
    run: { fontSize: 11, bold: false, italic: true, color: "#595959" },
    para: { spaceBefore: 0, spaceAfter: 8, lineHeight: 1.15, list: "none" },
  },
];

const TABS = [
  "홈",
  "삽입",
  "그리기",
  "디자인",
  "레이아웃",
  "참조",
  "편지",
  "검토",
  "보기",
];

const keepFocus = (e: React.MouseEvent): void => e.preventDefault();

/** 메뉴가 열려 있을 때 영역 밖 클릭이면 닫는다 */
const useOutsideClose = (
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  close: () => void,
): void => {
  useEffect(() => {
    if (!active) return;
    const onDoc = (e: MouseEvent): void => {
      const target = e.target as Node | null;
      if (target && ref.current && !ref.current.contains(target)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, active, close]);
};

/** 문자 음영으로 쓰는 회색 */
const CHAR_SHADE = "#d9d9d9";

type GroupProps = {
  editor: Editor;
  style: RunStyle;
  para: ParagraphStyle;
  after: () => void;
};

const ClipboardGroup = ({ editor, after }: GroupProps) => {
  const painterOn = editor.getState().painter !== null;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useOutsideClose(wrapRef, open, () => setOpen(false));
  const paste = async (): Promise<void> => {
    setOpen(false);
    try {
      const text = await navigator.clipboard.readText();
      if (text) editor.insertText(text);
    } catch {
      /* 클립보드 권한 거부 — 무시 */
    }
    after();
  };
  const copy = (cut: boolean): void => {
    const text = editor.selectedText();
    if (text) {
      void navigator.clipboard.writeText(text);
      if (cut) editor.deleteBackward();
    }
  };
  return (
    <div className={cx("group")} ref={wrapRef}>
      <div className={cx("groupRow")}>
        <div className={cx("bigWrap", "dropWrap")}>
          <button
            type="button"
            className={cx("bigBtn")}
            title="붙여넣기 (⌘V)"
            onMouseDown={keepFocus}
            onClick={() => void paste()}
          >
            <span className={cx("bigIcon")}>
              <ClipboardPaste24Regular />
            </span>
            <span>붙여넣기</span>
          </button>
          <button
            type="button"
            className={cx("btn", "caretBtn")}
            title="붙여넣기 옵션"
            onMouseDown={keepFocus}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown12Regular />
          </button>
          {open && (
            <span className={cx("menu", "menuBelow")}>
              <button type="button" className={cx("menuItem")} onMouseDown={keepFocus} onClick={() => void paste()}>
                텍스트만 유지
              </button>
              <button type="button" className={cx("menuItem")} disabled>
                원본 서식 유지 (준비 중)
              </button>
            </span>
          )}
        </div>
        <div className={cx("miniCol")}>
          <button
            type="button"
            className={cx("btn")}
            title="잘라내기 (⌘X)"
            onMouseDown={keepFocus}
            onClick={() => copy(true)}
          >
            <Cut20Regular />
          </button>
          <button
            type="button"
            className={cx("btn")}
            title="복사 (⌘C)"
            onMouseDown={keepFocus}
            onClick={() => copy(false)}
          >
            <Copy20Regular />
          </button>
          <button
            type="button"
            className={cx("btn", { active: painterOn })}
            title="서식 복사 — 클릭 후 적용할 텍스트를 드래그"
            onMouseDown={keepFocus}
            onClick={() => editor.startPainter()}
          >
            <PaintBrush20Regular />
          </button>
        </div>
      </div>
    </div>
  );
};

const CASE_ITEMS: [
  string,
  "sentence" | "lower" | "upper" | "title" | "toggle" | "half" | "full",
][] = [
  ["문장의 첫 글자를 대문자로", "sentence"],
  ["소문자로", "lower"],
  ["대문자로", "upper"],
  ["각 단어를 대문자로", "title"],
  ["대/소문자 전환", "toggle"],
  ["반자로", "half"],
  ["전자로", "full"],
];

const FontGroup = ({ editor, style, after }: GroupProps) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  useOutsideClose(groupRef, openMenu !== null, () => setOpenMenu(null));
  const colorInputRef = useRef<HTMLInputElement>(null);
  const lastColorRef = useRef("#ff0000");
  const lastHlRef = useRef("#ffff00");
  void after;
  const toggleMenu = (name: string): void =>
    setOpenMenu((v) => (v === name ? null : name));
  const pickRun = (patch: Partial<RunStyle>): void => {
    editor.setRunStyle(patch);
    setOpenMenu(null);
  };
  const currentFont =
    FONTS.find((f) => f.value === style.fontFamily)?.label ?? "사용자 글꼴";

  return (
    <div className={cx("group")} ref={groupRef}>
      <div className={cx("groupRows")}>
        <div className={cx("groupRow")}>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("select", "font")}
              title="글꼴"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("font")}
            >
              <span className={cx("selectLabel")}>{currentFont}</span>
              <ChevronDown12Regular />
            </button>
            {openMenu === "font" && (
              <span className={cx("menu", "fontMenu")}>
                <span className={cx("menuHeader")}>테마 글꼴</span>
                {FONTS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={cx("menuItem")}
                    style={{ fontFamily: f.value, fontSize: 15 }}
                    onMouseDown={keepFocus}
                    onClick={() => pickRun({ fontFamily: f.value })}
                  >
                    <span className={cx("check")}>
                      {style.fontFamily === f.value ? "✓" : ""}
                    </span>
                    {f.label}
                  </button>
                ))}
              </span>
            )}
          </span>
          <span className={cx("dropWrap")}>
            <span className={cx("select", "size")} title="글꼴 크기">
              <input
                key={style.fontSize}
                className={cx("sizeInput")}
                defaultValue={style.fontSize}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  // 포커스가 에디터로 돌아간 뒤 같은 Enter가 개행으로 들어가는 것을 차단
                  e.preventDefault();
                  const v = Number(e.currentTarget.value);
                  if (Number.isFinite(v) && v >= 1 && v <= 400) {
                    editor.setRunStyle({ fontSize: Math.round(v * 2) / 2 });
                    after();
                  }
                }}
                aria-label="글꼴 크기"
              />
              <button
                type="button"
                className={cx("btn", "caretBtn")}
                title="크기 목록"
                onMouseDown={keepFocus}
                onClick={() => toggleMenu("size")}
              >
                <ChevronDown12Regular />
              </button>
            </span>
            {openMenu === "size" && (
              <span className={cx("menu", "sizeMenu")}>
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={cx("menuItem")}
                    onMouseDown={keepFocus}
                    onClick={() => pickRun({ fontSize: s })}
                  >
                    <span className={cx("check")}>
                      {style.fontSize === s ? "✓" : ""}
                    </span>
                    {s}
                  </button>
                ))}
              </span>
            )}
          </span>
          <button
            type="button"
            className={cx("btn")}
            title="글꼴 크게"
            onMouseDown={keepFocus}
            onClick={() => editor.adjustFontSize(1)}
          >
            <FontIncrease20Regular />
          </button>
          <button
            type="button"
            className={cx("btn")}
            title="글꼴 작게"
            onMouseDown={keepFocus}
            onClick={() => editor.adjustFontSize(-1)}
          >
            <FontDecrease20Regular />
          </button>
          <span className={cx("vDivider")} />
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn")}
              title="대소문자 바꾸기"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("aa")}
            >
              <TextChangeCase20Regular />
              <ChevronDown12Regular />
            </button>
            {openMenu === "aa" && (
              <span className={cx("menu")}>
                {CASE_ITEMS.map(([label, kind]) => (
                  <button
                    key={kind}
                    type="button"
                    className={cx("menuItem")}
                    onMouseDown={keepFocus}
                    onClick={() => {
                      editor.transformCase(kind);
                      setOpenMenu(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </span>
            )}
          </span>
          <span className={cx("vDivider")} />
          <button
            type="button"
            className={cx("btn")}
            title="모든 서식 지우기"
            onMouseDown={keepFocus}
            onClick={() => editor.clearFormatting()}
          >
            <TextClearFormatting20Regular />
          </button>
          <button
            type="button"
            className={cx("btn")}
            disabled
            title="윗주 달기 (준비 중)"
          >
            내천
          </button>
          <button
            type="button"
            className={cx("btn")}
            disabled
            title="문자 테두리 (준비 중)"
          >
            <span className={cx("boxedGlyph")}>가</span>
          </button>
        </div>
        <div className={cx("groupRow")}>
          <button
            type="button"
            className={cx("btn", "bold", { active: style.bold })}
            title="굵게 (⌘B)"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleStyle("bold")}
          >
            가
          </button>
          <button
            type="button"
            className={cx("btn", "italic", { active: style.italic })}
            title="기울임꼴 (⌘I)"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleStyle("italic")}
          >
            가
          </button>
          <button
            type="button"
            className={cx("btn", "underline", { active: style.underline })}
            title="밑줄 (⌘U)"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleStyle("underline")}
          >
            가
          </button>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn", "caretBtn")}
              title="밑줄 종류"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("underline")}
            >
              <ChevronDown12Regular />
            </button>
            {openMenu === "underline" && (
              <span className={cx("menu", "underlineMenu")}>
                {UNDERLINE_STYLES.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    className={cx("menuItem")}
                    title={u.key}
                    onMouseDown={keepFocus}
                    onClick={() =>
                      pickRun({
                        underline: true,
                        underlineStyle: u.key as UnderlineStyle,
                      })
                    }
                  >
                    <span className={cx("check")}>
                      {(style.underlineStyle ?? "single") === u.key &&
                      style.underline
                        ? "✓"
                        : ""}
                    </span>
                    {u.css === "wave" ? (
                      <span className={cx("uWave")}>〰〰〰〰〰〰</span>
                    ) : (
                      <span className={cx("uSample", u.css)} />
                    )}
                  </button>
                ))}
              </span>
            )}
          </span>
          <button
            type="button"
            className={cx("btn", "strike", { active: style.strike })}
            title="취소선"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleStyle("strike")}
          >
            가
          </button>
          <button
            type="button"
            className={cx("btn", { active: style.verticalAlign === "sub" })}
            title="아래 첨자"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleVerticalAlign("sub")}
          >
            <TextSubscript20Regular />
          </button>
          <button
            type="button"
            className={cx("btn", { active: style.verticalAlign === "super" })}
            title="위 첨자"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleVerticalAlign("super")}
          >
            <TextSuperscript20Regular />
          </button>
          <span className={cx("vDivider")} />
          <button
            type="button"
            className={cx("btn")}
            disabled
            title="텍스트 효과 (준비 중)"
          >
            <span className={cx("effectGlyph")}>가</span>
          </button>
          <button
            type="button"
            className={cx("btn")}
            title="형광펜 (마지막 색 적용)"
            onMouseDown={keepFocus}
            onClick={() => editor.setRunStyle({ highlight: lastHlRef.current })}
          >
            <span
              className={cx("colorGlyph")}
              style={{ borderBottomColor: lastHlRef.current }}
            >
              <Highlight20Regular />
            </span>
          </button>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn", "caretBtn")}
              title="형광펜 색"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("hl")}
            >
              <ChevronDown12Regular />
            </button>
            {openMenu === "hl" && (
              <span className={cx("menu", "colorMenu")}>
                <button
                  type="button"
                  className={cx("noColorBtn")}
                  onMouseDown={keepFocus}
                  onClick={() => pickRun({ highlight: null })}
                >
                  색 없음
                </button>
                <span className={cx("colorGrid", "cols5")}>
                  {HIGHLIGHTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cx("swatch")}
                      style={{ background: c }}
                      title={c}
                      onMouseDown={keepFocus}
                      onClick={() => {
                        lastHlRef.current = c;
                        pickRun({ highlight: c });
                      }}
                    />
                  ))}
                </span>
              </span>
            )}
          </span>
          <button
            type="button"
            className={cx("btn")}
            title="글꼴 색 (마지막 색 적용)"
            onMouseDown={keepFocus}
            onClick={() => editor.setRunStyle({ color: lastColorRef.current })}
          >
            <span
              className={cx("colorGlyph")}
              style={{ borderBottomColor: lastColorRef.current }}
            >
              가
            </span>
          </button>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn", "caretBtn")}
              title="글꼴 색 선택"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("color")}
            >
              <ChevronDown12Regular />
            </button>
            {openMenu === "color" && (
              <span className={cx("menu", "colorMenu")}>
                <button
                  type="button"
                  className={cx("noColorBtn")}
                  onMouseDown={keepFocus}
                  onClick={() => pickRun({ color: "#1f1f1f" })}
                >
                  자동
                </button>
                <span className={cx("menuHeader")}>테마 색</span>
                <span className={cx("colorGrid", "cols10")}>
                  {THEME_BASE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cx("swatch")}
                      style={{ background: c }}
                      title={c}
                      onMouseDown={keepFocus}
                      onClick={() => {
                        lastColorRef.current = c;
                        pickRun({ color: c });
                      }}
                    />
                  ))}
                  {Array.from({ length: 5 }, (_, r) =>
                    THEME_BASE.map((b) => {
                      const c = themeShades(b)[r] ?? b;
                      return (
                        <button
                          key={`${b}-${r}`}
                          type="button"
                          className={cx("swatch")}
                          style={{ background: c }}
                          title={c}
                          onMouseDown={keepFocus}
                          onClick={() => {
                            lastColorRef.current = c;
                            pickRun({ color: c });
                          }}
                        />
                      );
                    }),
                  )}
                </span>
                <span className={cx("menuHeader")}>표준 색</span>
                <span className={cx("colorGrid", "cols10")}>
                  {STANDARD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cx("swatch")}
                      style={{ background: c }}
                      title={c}
                      onMouseDown={keepFocus}
                      onClick={() => {
                        lastColorRef.current = c;
                        pickRun({ color: c });
                      }}
                    />
                  ))}
                </span>
                <button
                  type="button"
                  className={cx("menuItem")}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    colorInputRef.current?.click();
                    setOpenMenu(null);
                  }}
                >
                  🎨 다른 색...
                </button>
              </span>
            )}
          </span>
          <input
            ref={colorInputRef}
            type="color"
            className={cx("fileInput")}
            value={style.color}
            onChange={(e) => {
              lastColorRef.current = e.target.value;
              editor.setRunStyle({ color: e.target.value });
            }}
            aria-label="다른 색"
          />
          <button
            type="button"
            className={cx("btn", { active: style.highlight === CHAR_SHADE })}
            title="문자 음영"
            onMouseDown={keepFocus}
            onClick={() =>
              editor.setRunStyle({
                highlight: style.highlight === CHAR_SHADE ? null : CHAR_SHADE,
              })
            }
          >
            <span style={{ background: "#8f8f94", padding: "0 3px" }}>가</span>
          </button>
          <button
            type="button"
            className={cx("btn")}
            disabled
            title="원 문자 (준비 중)"
          >
            ㉄
          </button>
        </div>
      </div>
    </div>
  );
};

const BULLET_LIB = ["●", "■", "◆", "✦", "✓", "➤", "✧"];

const NUM_LIB: {
  fmt: NonNullable<ParagraphStyle["numFmt"]>;
  preview: string[];
}[] = [
  { fmt: "decimal", preview: ["1.", "2.", "3."] },
  { fmt: "circled", preview: ["①", "②", "③"] },
  { fmt: "upperRoman", preview: ["I.", "II.", "III."] },
  { fmt: "ganadaParen", preview: ["가)", "나)", "다)"] },
  { fmt: "consonantParen", preview: ["(ㄱ)", "(ㄴ)", "(ㄷ)"] },
  { fmt: "upperLetter", preview: ["A.", "B.", "C."] },
  { fmt: "lowerRoman", preview: ["i.", "ii.", "iii."] },
];

const BORDER_SIDES: {
  key: "bottom" | "top" | "left" | "right";
  label: string;
}[] = [
  { key: "bottom", label: "아래쪽 테두리" },
  { key: "top", label: "위쪽 테두리" },
  { key: "left", label: "왼쪽 테두리" },
  { key: "right", label: "오른쪽 테두리" },
];

/** 색 없음 + 테마/표준 색 팔레트 메뉴 */
const PaletteMenu = ({
  noneLabel,
  onNone,
  onPick,
  onCustom,
}: {
  noneLabel: string;
  onNone: () => void;
  onPick: (color: string) => void;
  onCustom?: () => void;
}) => (
  <span className={cx("menu", "colorMenu")}>
    <button
      type="button"
      className={cx("noColorBtn")}
      onMouseDown={keepFocus}
      onClick={onNone}
    >
      {noneLabel}
    </button>
    <span className={cx("menuHeader")}>테마 색</span>
    <span className={cx("colorGrid", "cols10")}>
      {THEME_BASE.map((c) => (
        <button
          key={c}
          type="button"
          className={cx("swatch")}
          style={{ background: c }}
          title={c}
          onMouseDown={keepFocus}
          onClick={() => onPick(c)}
        />
      ))}
      {Array.from({ length: 5 }, (_, r) =>
        THEME_BASE.map((b) => {
          const c = themeShades(b)[r] ?? b;
          return (
            <button
              key={`${b}-${r}`}
              type="button"
              className={cx("swatch")}
              style={{ background: c }}
              title={c}
              onMouseDown={keepFocus}
              onClick={() => onPick(c)}
            />
          );
        }),
      )}
    </span>
    <span className={cx("menuHeader")}>표준 색</span>
    <span className={cx("colorGrid", "cols10")}>
      {STANDARD_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={cx("swatch")}
          style={{ background: c }}
          title={c}
          onMouseDown={keepFocus}
          onClick={() => onPick(c)}
        />
      ))}
    </span>
    {onCustom && (
      <button
        type="button"
        className={cx("menuItem")}
        onMouseDown={keepFocus}
        onClick={onCustom}
      >
        🎨 다른 색...
      </button>
    )}
  </span>
);

const ParagraphGroup = ({ editor, para, after }: GroupProps) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const shadeInputRef = useRef<HTMLInputElement>(null);
  useOutsideClose(groupRef, openMenu !== null, () => setOpenMenu(null));
  void after;
  const toggleMenu = (name: string): void =>
    setOpenMenu((v) => (v === name ? null : name));
  const pickPara = (patch: Partial<ParagraphStyle>): void => {
    editor.setParaStyle(patch);
    setOpenMenu(null);
  };
  const bd = para.borders;

  return (
    <div className={cx("group")} ref={groupRef}>
      <div className={cx("groupRows")}>
        <div className={cx("groupRow")}>
          <button
            type="button"
            className={cx("btn", { active: para.list === "bullet" })}
            title="글머리 기호"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleList("bullet")}
          >
            <TextBulletListLtr20Regular />
          </button>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn", "caretBtn")}
              title="글머리 기호 라이브러리"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("bullet")}
            >
              <ChevronDown12Regular />
            </button>
            {openMenu === "bullet" && (
              <span className={cx("menu")}>
                <span className={cx("menuHeader")}>글머리 기호 라이브러리</span>
                <span className={cx("libGrid")}>
                  <button
                    type="button"
                    className={cx("libCard", {
                      activeCard: para.list !== "bullet",
                    })}
                    onMouseDown={keepFocus}
                    onClick={() => pickPara({ list: "none" })}
                  >
                    <span className={cx("libNone")}>없음</span>
                  </button>
                  {BULLET_LIB.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cx("libCard", {
                        activeCard:
                          para.list === "bullet" &&
                          (para.bulletChar ?? "•") === c,
                      })}
                      onMouseDown={keepFocus}
                      onClick={() =>
                        pickPara({ list: "bullet", bulletChar: c })
                      }
                    >
                      {c}
                    </button>
                  ))}
                </span>
              </span>
            )}
          </span>
          <button
            type="button"
            className={cx("btn", { active: para.list === "number" })}
            title="번호 매기기"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleList("number")}
          >
            <TextNumberListLtr20Regular />
          </button>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn", "caretBtn")}
              title="번호 매기기 라이브러리"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("number")}
            >
              <ChevronDown12Regular />
            </button>
            {openMenu === "number" && (
              <span className={cx("menu")}>
                <span className={cx("menuHeader")}>번호 매기기 라이브러리</span>
                <span className={cx("libGrid")}>
                  <button
                    type="button"
                    className={cx("libCard", {
                      activeCard: para.list !== "number",
                    })}
                    onMouseDown={keepFocus}
                    onClick={() => pickPara({ list: "none" })}
                  >
                    <span className={cx("libNone")}>없음</span>
                  </button>
                  {NUM_LIB.map((n) => (
                    <button
                      key={n.fmt}
                      type="button"
                      className={cx("libCard", "numCard", {
                        activeCard:
                          para.list === "number" &&
                          (para.numFmt ?? "decimal") === n.fmt,
                      })}
                      onMouseDown={keepFocus}
                      onClick={() =>
                        pickPara({ list: "number", numFmt: n.fmt })
                      }
                    >
                      {n.preview.map((line) => (
                        <span key={line} className={cx("numLine")}>
                          {line} <i />
                        </span>
                      ))}
                    </button>
                  ))}
                </span>
              </span>
            )}
          </span>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn")}
              title="다단계 목록"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("multi")}
            >
              <TextBulletListTree20Regular />
              <ChevronDown12Regular />
            </button>
            {openMenu === "multi" && (
              <span className={cx("menu")}>
                <button type="button" className={cx("menuItem")} disabled>
                  다단계 목록은 준비 중입니다
                </button>
              </span>
            )}
          </span>
          <span className={cx("vDivider")} />
          <button
            type="button"
            className={cx("btn")}
            title="내어쓰기"
            onMouseDown={keepFocus}
            onClick={() => editor.adjustIndent(-1)}
          >
            <TextIndentDecrease20Regular />
          </button>
          <button
            type="button"
            className={cx("btn")}
            title="들여쓰기"
            onMouseDown={keepFocus}
            onClick={() => editor.adjustIndent(1)}
          >
            <TextIndentIncrease20Regular />
          </button>
          <span className={cx("vDivider")} />
          <button
            type="button"
            className={cx("btn")}
            title="텍스트 정렬 (가나다순)"
            onMouseDown={keepFocus}
            onClick={() => editor.sortParagraphs()}
          >
            <TextSortAscending20Regular />
          </button>
          <button
            type="button"
            className={cx("btn", { active: editor.getState().showMarks })}
            title="편집 기호 표시/숨기기 (¶)"
            onMouseDown={keepFocus}
            onClick={() => editor.toggleMarks()}
          >
            <TextParagraph20Regular />
          </button>
        </div>
        <div className={cx("groupRow")}>
          {ALIGNS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={cx("btn", { active: para.align === a.key })}
              title={a.title}
              onMouseDown={keepFocus}
              onClick={() => editor.setParaStyle({ align: a.key })}
            >
              {a.label}
            </button>
          ))}
          <span className={cx("vDivider")} />
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn")}
              title="줄 및 단락 간격"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("line")}
            >
              <TextLineSpacing20Regular />
              <ChevronDown12Regular />
            </button>
            {openMenu === "line" && (
              <span className={cx("menu")}>
                {[1, 1.15, 1.5, 2, 2.5, 3].map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={cx("menuItem")}
                    onMouseDown={keepFocus}
                    onClick={() => pickPara({ lineHeight: l })}
                  >
                    <span className={cx("check")}>
                      {para.lineHeight === l ? "✓" : ""}
                    </span>
                    {l.toFixed(l === 1.15 ? 2 : 1)}
                  </button>
                ))}
                <button type="button" className={cx("menuItem")} disabled>
                  줄 간격 옵션...
                </button>
                <span className={cx("menuSep")} />
                <button
                  type="button"
                  className={cx("menuItem")}
                  onMouseDown={keepFocus}
                  onClick={() =>
                    pickPara({ spaceBefore: para.spaceBefore > 0 ? 0 : 12 })
                  }
                >
                  {para.spaceBefore > 0
                    ? "단락 앞 공백 제거"
                    : "단락 앞에 공백 추가"}
                </button>
                <button
                  type="button"
                  className={cx("menuItem")}
                  onMouseDown={keepFocus}
                  onClick={() =>
                    pickPara({ spaceAfter: para.spaceAfter > 0 ? 0 : 8 })
                  }
                >
                  {para.spaceAfter > 0
                    ? "단락 뒤 공백 제거"
                    : "단락 뒤에 공백 추가"}
                </button>
              </span>
            )}
          </span>
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn")}
              title="단락 음영"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("shade")}
            >
              <ColorFill20Regular />
              <ChevronDown12Regular />
            </button>
            {openMenu === "shade" && (
              <PaletteMenu
                noneLabel="색 없음"
                onNone={() => pickPara({ shading: null })}
                onPick={(c) => pickPara({ shading: c })}
                onCustom={() => {
                  shadeInputRef.current?.click();
                  setOpenMenu(null);
                }}
              />
            )}
          </span>
          <input
            ref={shadeInputRef}
            type="color"
            className={cx("fileInput")}
            value={para.shading ?? "#ffffff"}
            onChange={(e) => editor.setParaStyle({ shading: e.target.value })}
            aria-label="단락 음영 다른 색"
          />
          <span className={cx("dropWrap")}>
            <button
              type="button"
              className={cx("btn")}
              title="테두리"
              onMouseDown={keepFocus}
              onClick={() => toggleMenu("border")}
            >
              <BorderAll20Regular />
              <ChevronDown12Regular />
            </button>
            {openMenu === "border" && (
              <span className={cx("menu")}>
                {BORDER_SIDES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={cx("menuItem")}
                    onMouseDown={keepFocus}
                    onClick={() =>
                      pickPara({ borders: { ...bd, [s.key]: !bd[s.key] } })
                    }
                  >
                    <span className={cx("check")}>{bd[s.key] ? "✓" : ""}</span>
                    {s.label}
                  </button>
                ))}
                <span className={cx("menuSep")} />
                <button
                  type="button"
                  className={cx("menuItem")}
                  onMouseDown={keepFocus}
                  onClick={() =>
                    pickPara({
                      borders: {
                        top: false,
                        right: false,
                        bottom: false,
                        left: false,
                      },
                    })
                  }
                >
                  <span className={cx("check")} />
                  테두리 없음
                </button>
                <button
                  type="button"
                  className={cx("menuItem")}
                  onMouseDown={keepFocus}
                  onClick={() =>
                    pickPara({
                      borders: {
                        top: true,
                        right: true,
                        bottom: true,
                        left: true,
                      },
                    })
                  }
                >
                  <span className={cx("check")} />
                  바깥쪽 테두리
                </button>
                <span className={cx("menuSep")} />
                {[
                  "안쪽 테두리",
                  "가로줄",
                  "표 그리기",
                  "테두리 및 음영...",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={cx("menuItem")}
                    disabled
                  >
                    {label}
                  </button>
                ))}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

const StyleGallery = ({ editor, style, para }: GroupProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useOutsideClose(wrapRef, open, () => setOpen(false));
  const card = (p: Preset): React.ReactNode => (
    <button
      key={p.name}
      type="button"
      className={cx("styleCard", {
        active:
          style.fontSize === (p.run.fontSize ?? 11) &&
          style.color === (p.run.color ?? "#1f1f1f") &&
          style.italic === (p.run.italic ?? false) &&
          style.bold === (p.run.bold ?? false) &&
          para.spaceBefore === (p.para.spaceBefore ?? 0) &&
          para.spaceAfter === (p.para.spaceAfter ?? 8) &&
          para.lineHeight === (p.para.lineHeight ?? 1.15),
      })}
      title={`${p.name} 스타일 적용`}
      onMouseDown={keepFocus}
      onClick={() => {
        editor.applyStylePreset(p.run, p.para);
        setOpen(false);
      }}
    >
      <span
        className={cx("stylePreview")}
        style={{
          color: p.run.color ?? "#1f1f1f",
          fontStyle: p.run.italic ? "italic" : "normal",
          fontSize: Math.min(15, (p.run.fontSize ?? 11) * 0.9),
        }}
      >
        가나다AaBbC
      </span>
      <span className={cx("styleName")}>{p.name}</span>
    </button>
  );

  return (
    <div className={cx("group", "galleryGroup")} ref={wrapRef}>
      <div className={cx("galleryWrap", "dropWrap")}>
        <span className={cx("gallery")}>{STYLE_PRESETS.map(card)}</span>
        <button
          type="button"
          className={cx("expander")}
          title="추가 스타일"
          onMouseDown={keepFocus}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown12Regular />
        </button>
        {open && (
          <span className={cx("menu", "galleryMenu")}>
            <span className={cx("menuHeader")}>스타일 갤러리</span>
            <span className={cx("galleryGrid")}>{STYLE_PRESETS.map(card)}</span>
            <span className={cx("menuSep")} />
            <button
              type="button"
              className={cx("menuItem")}
              onMouseDown={keepFocus}
              onClick={() => {
                editor.clearFormatting();
                setOpen(false);
              }}
            >
              서식 지우기
            </button>
          </span>
        )}
      </div>
    </div>
  );
};

type Props = {
  editor: Editor;
  onAfterCommand: () => void;
};

const Ribbon = ({ editor, onAfterCommand }: Props) => {
  const state = useSyncExternalStore(editor.subscribe, editor.getState);
  void state;
  const style = editor.currentStyle();
  const para = editor.currentParaStyle();
  const [tab, setTab] = useState("홈");
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileNameRef = useRef("문서1.docx");

  const openFile = async (file: File): Promise<void> => {
    if (!file.name.toLowerCase().endsWith(".docx")) return;
    try {
      editor.setDocument(importDocx(new Uint8Array(await file.arrayBuffer())));
      fileNameRef.current = `${file.name.replace(/\.[^.]+$/, "")}.docx`;
    } catch {
      /* 잘못된 파일 — 무시 */
    }
    onAfterCommand();
  };

  const save = (): void => {
    const data = exportDocx(editor.getState().doc);
    const copy = new Uint8Array(data.length);
    copy.set(data);
    const blob = new Blob([copy], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameRef.current;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupProps: GroupProps = { editor, style, para, after: onAfterCommand };

  return (
    <div className={cx("chrome")}>
      <div className={cx("titleBar")}>
        <span className={cx("autoSave")}>
          자동 저장 <i className={cx("toggle")} />
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className={cx("fileInput")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void openFile(file);
            e.target.value = "";
          }}
          aria-label="파일 열기"
        />
        <button
          type="button"
          className={cx("qBtn")}
          title="열기 (.docx)"
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen20Regular />
        </button>
        <button
          type="button"
          className={cx("qBtn")}
          title="저장 (.docx 다운로드)"
          onMouseDown={keepFocus}
          onClick={save}
        >
          <Save20Regular />
        </button>
        <button
          type="button"
          className={cx("qBtn")}
          title="실행 취소 (⌘Z)"
          disabled={!state.canUndo}
          onMouseDown={keepFocus}
          onClick={() => editor.undo()}
        >
          <ArrowUndo20Regular />
        </button>
        <button
          type="button"
          className={cx("qBtn")}
          title="다시 실행 (⌘⇧Z)"
          disabled={!state.canRedo}
          onMouseDown={keepFocus}
          onClick={() => editor.redo()}
        >
          <ArrowRedo20Regular />
        </button>
        <span className={cx("docTitle")}>
          {fileNameRef.current.replace(/\.docx$/, "")}
        </span>
        <span className={cx("searchWrap")}>
          <Search16Regular />
          <input
            className={cx("search")}
            placeholder="검색 (Enter로 다음 찾기)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") editor.findNext(query);
              if (e.key === "Escape") onAfterCommand();
            }}
          />
        </span>
        <button
          type="button"
          className={cx("shareBtn")}
          title="공유 (준비 중)"
          disabled
        >
          공유
        </button>
      </div>

      <div className={cx("tabRow")}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={cx("tab", { activeTab: t === tab })}
            onMouseDown={keepFocus}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={cx("ribbon")}>
        {tab === "홈" ? (
          <>
            <ClipboardGroup {...groupProps} />
            <span className={cx("groupDivider")} />
            <FontGroup {...groupProps} />
            <span className={cx("groupDivider")} />
            <ParagraphGroup {...groupProps} />
            <span className={cx("groupDivider")} />
            <StyleGallery {...groupProps} />
          </>
        ) : (
          <div className={cx("placeholder")}>
            “{tab}” 탭의 기능은 준비 중입니다 — 홈 탭의 모든 기능을 사용해
            보세요
          </div>
        )}
      </div>
    </div>
  );
};

export default Ribbon;
