/** 하단 상태 표시줄 — MS Word 구성: 페이지/단어/맞춤법/언어/접근성 + 보기/확대 */

import { useState, useSyncExternalStore } from "react";
import classNames from "classnames/bind";
import {
  Book16Regular,
  CheckmarkCircle16Regular,
  Document16Regular,
  Globe16Regular,
} from "@fluentui/react-icons";
import type { Editor } from "@/core/editor/editor";
import { paraAt, paraText } from "@/core/model/document";
import styles from "./StatusBar.module.scss";

const cx = classNames.bind(styles);

const LANGUAGES = [
  "영어(미국)",
  "한국어",
  "일본어",
  "중국어(간체)",
  "프랑스어",
  "독일어",
  "스페인어",
  "이탈리아어",
  "포르투갈어",
  "러시아어",
  "네덜란드어",
  "베트남어",
];

type Props = {
  editor: Editor;
  pageCount: number;
  caretPage: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

const StatusBar = ({
  editor,
  pageCount,
  caretPage,
  zoom,
  onZoomChange,
}: Props) => {
  const state = useSyncExternalStore(editor.subscribe, editor.getState);
  const { words } = editor.stats();

  // 교정 언어 설정 (Word의 언어 대화상자)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [noProof, setNoProof] = useState(false);
  const [manualLang, setManualLang] = useState("한국어");
  const [picked, setPicked] = useState("한국어");

  // 캐럿 직전 텍스트의 언어 감지 (자동 검색 모드)
  const focus = state.selection.focus;
  const fullText = paraText(paraAt(state.doc, focus.para));
  const window = fullText.slice(Math.max(0, focus.offset - 20), focus.offset);
  const sample = /[가-힣A-Za-z]/.test(window) ? window : fullText;
  const hangul = (sample.match(/[가-힣]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  const detected = latin > hangul ? "영어(미국)" : "한국어";
  const language = autoDetect ? detected : manualLang;

  return (
    <div className={cx("statusBar")}>
      <span>
        {caretPage}/{pageCount} 페이지
      </span>
      <span className={cx("divider")} />
      <span>{words.toLocaleString()}개 단어</span>
      <span className={cx("divider")} />
      <span className={cx("sbIcon")} title="맞춤법 검사 (준비 중)">
        <CheckmarkCircle16Regular />
      </span>
      <button
        type="button"
        className={cx("sbBtn")}
        title="교정 언어 설정"
        onClick={() => {
          setPicked(language);
          setDialogOpen(true);
        }}
      >
        {language}
      </button>
      <span className={cx("divider")} />
      <span>접근성: 계속 진행 가능</span>
      <span className={cx("spacer")} />
      <button
        type="button"
        className={cx("sbBtn")}
        disabled
        title="포커스 (준비 중)"
      >
        포커스
      </button>
      <span className={cx("viewIcons")}>
        <button
          type="button"
          className={cx("sbBtn")}
          disabled
          title="읽기 모드 (준비 중)"
        >
          <Book16Regular />
        </button>
        <button type="button" className={cx("sbBtn", "activeView")} title="인쇄 모양">
          <Document16Regular />
        </button>
        <button
          type="button"
          className={cx("sbBtn")}
          disabled
          title="웹 모양 (준비 중)"
        >
          <Globe16Regular />
        </button>
      </span>
      <input
        className={cx("zoomSlider")}
        type="range"
        min={50}
        max={200}
        step={5}
        value={Math.round(zoom * 100)}
        onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
        aria-label="확대/축소"
      />
      <span className={cx("zoomValue")}>{Math.round(zoom * 100)}%</span>

      {dialogOpen && (
        <div className={cx("dialogOverlay")} role="presentation" onClick={() => setDialogOpen(false)}>
          <div className={cx("dialog")} role="dialog" aria-label="언어" onClick={(e) => e.stopPropagation()}>
            <div className={cx("dialogTitle")}>언어</div>
            <div className={cx("dialogLabel")}>사용할 언어:</div>
            <div className={cx("langList")}>
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={cx("langItem", { selected: picked === l })}
                  onClick={() => setPicked(l)}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className={cx("dialogDesc")}>
              사전이 설치되어 있으면 맞춤법 검사기와 기타 언어 교정 도구에서는
              선택한 언어 사전을 자동으로 사용합니다.
            </p>
            <label className={cx("dialogCheck")}>
              <input
                type="checkbox"
                checked={noProof}
                onChange={(e) => setNoProof(e.target.checked)}
              />
              맞춤법 및 문법 검사 안 함
            </label>
            <label className={cx("dialogCheck")}>
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
              />
              자동으로 언어 검색
            </label>
            <div className={cx("dialogFooter")}>
              <button
                type="button"
                className={cx("dlgBtn")}
                onClick={() => {
                  setPicked("한국어");
                  setAutoDetect(true);
                  setNoProof(false);
                }}
              >
                기본값...
              </button>
              <span className={cx("spacer")} />
              <button type="button" className={cx("dlgBtn")} onClick={() => setDialogOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className={cx("dlgBtn", "primary")}
                onClick={() => {
                  setManualLang(picked);
                  setDialogOpen(false);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBar;
