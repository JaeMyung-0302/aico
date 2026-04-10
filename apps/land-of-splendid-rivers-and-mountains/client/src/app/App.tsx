import { useCallback, useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { gameConfig } from "@/game/config";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { initStoreBridge, destroyStoreBridge } from "@/lib/store-bridge";
import { eventBus } from "@/lib/event-bus";
import { useLocale } from "@/i18n/useLocale";
import HUD from "@/ui/components/HUD";
import InventoryPanel from "@/ui/components/InventoryPanel";
import ShopPanel from "@/ui/components/ShopPanel";
import DialogBox from "@/ui/components/DialogBox";
import NPCPanel from "@/ui/components/NPCPanel";
import CraftingPanel from "@/ui/components/CraftingPanel";
import BuildingPanel from "@/ui/components/BuildingPanel";
import AnimalPanel from "@/ui/components/AnimalPanel";
import CombatHUD from "@/ui/components/CombatHUD";
import FishingMiniGame from "@/ui/components/FishingMiniGame";
import EventUI from "@/ui/components/EventUI";
import SeasonTransitionOverlay from "@/ui/components/SeasonTransitionOverlay";
import JournalPanel from "@/ui/components/JournalPanel";
import TouchControls from "@/ui/components/TouchControls";
import TitleScreen from "@/ui/pages/TitleScreen";
import SettingsPanel from "@/ui/components/SettingsPanel";
import SaveLoadScreen from "@/ui/components/SaveLoadScreen";
import GameTabBar from "@/ui/components/GameTabBar";
import type { TabId } from "@/ui/components/GameTabBar";
import { useGameStore } from "@/stores/useGameStore";

type Screen = "loading" | "title" | "game";

const ASPECT = GAME_CONSTANTS.GAME_WIDTH / GAME_CONSTANTS.GAME_HEIGHT;

const useGameSize = () => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const vw = size.width;
  const vh = size.height;
  const viewAspect = vw / vh;

  if (viewAspect > ASPECT) {
    const w = vh * ASPECT;
    return { width: w, height: vh, left: (vw - w) / 2, top: 0 };
  }
  const h = vw / ASPECT;
  return { width: vw, height: h, left: 0, top: (vh - h) / 2 };
};

const App = () => {
  useLocale(); // force re-render on locale change so t() updates everywhere
  const gameRef = useRef<Phaser.Game | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveLoadOpen, setSaveLoadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(null);
  const dialogOpen = useGameStore((s) => s.dialogOpen);
  const gameSize = useGameSize();

  useEffect(() => {
    if (gameRef.current) return;

    initStoreBridge();
    gameRef.current = new Phaser.Game(gameConfig);

    const onTitleReady = () => {
      clearTimeout(fallbackTimer);
      setScreen("title");
    };
    eventBus.on("title:ready", onTitleReady);

    const fallbackTimer = setTimeout(() => {
      console.warn("[App] title:ready timeout — forcing title screen");
      setScreen("title");
    }, 10_000);

    return () => {
      clearTimeout(fallbackTimer);
      eventBus.off("title:ready", onTitleReady);
      destroyStoreBridge();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    setScreen("game");
    setSaveLoadOpen(false);
    setSettingsOpen(false);
    setActiveTab(null);
    eventBus.emit("title:start", undefined);
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    const onUiToggle = ({ panel }: { panel: string }) => {
      if (panel === "inventory") {
        setActiveTab((prev) => (prev === "inventory" ? null : "inventory"));
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (saveLoadOpen) {
          setSaveLoadOpen(false);
        } else if (activeTab !== null) {
          setActiveTab(null);
        }
      }
    };
    eventBus.on("ui:toggle", onUiToggle);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      eventBus.off("ui:toggle", onUiToggle);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen, saveLoadOpen, activeTab]);

  const backdropStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 115,
    pointerEvents: "auto",
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    left: gameSize.left,
    top: gameSize.top,
    width: gameSize.width,
    height: gameSize.height,
    pointerEvents: "none",
    overflow: "hidden",
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div id="game-container" style={{ width: "100%", height: "100%" }} />
      <div style={overlayStyle}>
        {screen === "title" && (
          <TitleScreen
            onStart={handleStart}
            onOpenSaveLoad={() => setSaveLoadOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {screen === "game" && (
          <>
            <HUD />
            <CombatHUD />
            {activeTab !== null && (
              <div
                style={backdropStyle}
                onClick={() => setActiveTab(null)}
                onTouchEnd={() => setActiveTab(null)}
              />
            )}
            <InventoryPanel open={activeTab === "inventory"} />
            <ShopPanel open={activeTab === "shop"} />
            <CraftingPanel open={activeTab === "crafting"} />
            <BuildingPanel open={activeTab === "building"} />
            <AnimalPanel open={activeTab === "animal"} />
            <NPCPanel open={activeTab === "npc"} />
            <DialogBox />
            <FishingMiniGame />
            <EventUI />
            <SeasonTransitionOverlay />
            <JournalPanel />
            {!dialogOpen && <TouchControls />}
            {!dialogOpen && (
              <GameTabBar activeTab={activeTab} onTabChange={handleTabChange} />
            )}
          </>
        )}
        <SettingsPanel
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
        <SaveLoadScreen
          visible={saveLoadOpen}
          onClose={() => setSaveLoadOpen(false)}
          onLoad={handleStart}
        />
      </div>
    </div>
  );
};

export default App;
