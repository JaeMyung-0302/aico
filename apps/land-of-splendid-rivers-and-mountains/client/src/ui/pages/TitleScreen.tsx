import { useState, type CSSProperties } from "react";
import { t } from "@/i18n";
import { saveManager } from "@/lib/save-manager";
import { useGameStore } from "@/stores/useGameStore";

interface Props {
  readonly onStart: () => void;
  readonly onOpenSaveLoad: () => void;
  readonly onOpenSettings: () => void;
}

const TitleScreen = ({ onStart, onOpenSaveLoad, onOpenSettings }: Props) => {
  const [fading, setFading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const hasSave = saveManager.hasSave();

  const handleNewGame = () => {
    saveManager.deleteSave();
    useGameStore.getState().reset();
    setFading(true);
    setTimeout(() => onStart(), 500);
  };

  const handleContinue = () => {
    setFading(true);
    setTimeout(() => onStart(), 500);
  };

  return (
    <div style={{ ...styles.container, opacity: fading ? 0 : 1 }}>
      {loadError && <p style={styles.errorText}>{t("ui.title.loadFailed")}</p>}

      <div style={styles.menu}>
        {hasSave && (
          <button style={styles.button} onClick={handleContinue}>
            {t("ui.title.continue")}
          </button>
        )}
        <button style={styles.button} onClick={handleNewGame}>
          {t("ui.title.newGame")}
        </button>
        {hasSave && (
          <button style={styles.buttonSecondary} onClick={onOpenSaveLoad}>
            {t("ui.title.load")}
          </button>
        )}
        <button style={styles.buttonSecondary} onClick={onOpenSettings}>
          {t("ui.title.settings")}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 60,
    backgroundImage: "url(assets/title-bg.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: '"Noto Sans KR", sans-serif',
    zIndex: 500,
    transition: "opacity 0.5s ease",
    pointerEvents: "auto",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: 180,
  },
  button: {
    padding: "10px 0",
    fontSize: 15,
    fontFamily: '"Noto Sans KR", sans-serif',
    fontWeight: "bold",
    color: "#fff",
    background: "rgba(74,222,128,0.85)",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    textShadow: "1px 1px 2px rgba(0,0,0,0.4)",
  },
  errorText: {
    fontSize: 13,
    color: "#ef4444",
    marginBottom: 8,
    textShadow: "1px 1px 2px rgba(0,0,0,0.6)",
  },
  buttonSecondary: {
    padding: "8px 0",
    fontSize: 13,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: "#eee",
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8,
    cursor: "pointer",
    textShadow: "1px 1px 2px rgba(0,0,0,0.6)",
  },
};

export default TitleScreen;
