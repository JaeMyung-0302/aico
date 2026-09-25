import { useCallback, useEffect, useState } from "react";
import { markOpened, UnknownUserError } from "./api.ts";
import Intro from "./components/Intro.tsx";
import Nav, { isView, type View } from "./components/Nav.tsx";
import { isTrackId, type TrackId } from "./domain.ts";
import { forgetUser, storedUserId } from "./push-client.ts";
import Flow from "./screens/Flow.tsx";
import Onboard from "./screens/Onboard.tsx";
import Settings from "./screens/Settings.tsx";
import Today from "./screens/Today.tsx";

/** 알림에서 넘어온 진입은 어느 화면과 트랙으로 갈지 URL 이 정한다. 주간 요약은 흐름으로. */
function initialView(): View {
  const requested = new URLSearchParams(window.location.search).get("view");
  return isView(requested) ? requested : "today";
}

function initialTrack(): TrackId | null {
  const requested = new URLSearchParams(window.location.search).get("track");
  return isTrackId(requested) ? requested : null;
}

export default function App() {
  const [userId, setUserId] = useState<string | null>(storedUserId);
  const [view, setView] = useState<View>(initialView);
  const [track] = useState<TrackId | null>(initialTrack);

  // 서버에서 구독이 사라진 경우(만료 삭제, 데이터 지우기) 온보딩으로 되돌려 재구독시킨다.
  const handleExpired = useCallback(() => {
    forgetUser();
    setUserId(null);
    setView("today");
  }, []);

  useEffect(() => {
    // 알림에서 넘어온 진입은 따로 남긴다. 응답률 퍼널에서 "열었는가"를 가르는 값이다.
    if (!userId) return;
    if (new URLSearchParams(window.location.search).get("from") !== "push")
      return;
    void markOpened(userId).catch((cause: unknown) => {
      if (cause instanceof UnknownUserError) handleExpired();
    });
  }, [userId, handleExpired]);

  const nav = <Nav current={view} onChange={setView} />;
  let screen;
  if (!userId) screen = <Onboard onEnabled={setUserId} />;
  else if (view === "flow") screen = <Flow userId={userId} onExpired={handleExpired} nav={nav} />;
  else if (view === "settings") screen = <Settings userId={userId} onExpired={handleExpired} nav={nav} />;
  else screen = <Today userId={userId} initialTrack={track} onExpired={handleExpired} nav={nav} />;

  return (
    <>
      <Intro />
      {screen}
    </>
  );
}
