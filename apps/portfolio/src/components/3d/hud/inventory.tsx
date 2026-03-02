"use client";

import { useCallback, useEffect, useState } from "react";

import { collectibles, TOTAL_COLLECTIBLES } from "@/content/collectibles";
import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/inventory.module.scss";

export const Inventory = () => {
  const collectedItems = useWorldStore((s) => s.collectedItems);
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  return (
    <>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {collectedItems.size}/{TOTAL_COLLECTIBLES}
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={close}>
          <div
            className={styles.panel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                수집 아이템 ({collectedItems.size}/{TOTAL_COLLECTIBLES})
              </h2>
              <button
                className={styles.closeBtn}
                onClick={close}
                type="button"
              >
                ×
              </button>
            </div>

            <div className={styles.grid}>
              {collectibles.map((item) => {
                const isCollected = collectedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`${styles.card} ${isCollected ? styles.collected : styles.uncollected}`}
                  >
                    <span className={styles.icon}>
                      {isCollected ? "✦" : "?"}
                    </span>
                    <p className={styles.cardName}>
                      {isCollected ? item.name : "???"}
                    </p>
                    {isCollected && (
                      <>
                        <p className={styles.cardDescription}>
                          {item.description}
                        </p>
                        <p className={styles.cardSkill}>{item.linkedSkill}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
