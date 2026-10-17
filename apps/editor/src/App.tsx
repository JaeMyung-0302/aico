import { useCallback, useMemo, useRef, useState } from "react";
import classNames from "classnames/bind";
import { Editor } from "@/core/editor/editor";
import { docFromText } from "@/core/model/document";
import EditorCanvas from "@/ui/EditorCanvas";
import Ribbon from "@/ui/Ribbon";
import StatusBar from "@/ui/StatusBar";
import styles from "./App.module.scss";

const cx = classNames.bind(styles);

const App = () => {
  const editor = useMemo(() => new Editor(docFromText("")), []);
  const [zoom, setZoom] = useState(1);
  const [layoutInfo, setLayoutInfo] = useState({ pageCount: 1, caretPage: 1 });
  const focusRef = useRef<(() => void) | null>(null);

  const handleLayoutInfo = useCallback(
    (info: { pageCount: number; caretPage: number }) => {
      setLayoutInfo((prev) =>
        prev.pageCount === info.pageCount && prev.caretPage === info.caretPage
          ? prev
          : info,
      );
    },
    [],
  );

  return (
    <div className={cx("app")}>
      <Ribbon editor={editor} onAfterCommand={() => focusRef.current?.()} />
      <EditorCanvas
        editor={editor}
        zoom={zoom}
        focusRef={focusRef}
        onLayoutInfo={handleLayoutInfo}
      />
      <StatusBar
        editor={editor}
        pageCount={layoutInfo.pageCount}
        caretPage={layoutInfo.caretPage}
        zoom={zoom}
        onZoomChange={setZoom}
      />
    </div>
  );
};

export default App;
