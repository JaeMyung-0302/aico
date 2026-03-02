"use client";

import { useEffect, useRef, useState } from "react";

import { collectibles } from "@/content/collectibles";
import { useWorldStore } from "@/stores/world-store";

const collectibleMap = new Map(collectibles.map((c) => [c.id, c]));

interface Notification {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export const CollectNotification = () => {
  const collectedItems = useWorldStore((s) => s.collectedItems);
  const [notifications, setNotifications] = useState<readonly Notification[]>(
    [],
  );
  const prevSizeRef = useRef(collectedItems.size);

  useEffect(() => {
    if (collectedItems.size > prevSizeRef.current) {
      const newItems = [...collectedItems].filter(
        (id) => !notifications.some((n) => n.id === id),
      );

      const newNotifs = newItems
        .map((id) => {
          const meta = collectibleMap.get(id);
          if (!meta) return null;
          return { id: meta.id, name: meta.name, description: meta.description };
        })
        .filter((n): n is Notification => n !== null);

      if (newNotifs.length > 0) {
        setNotifications((prev) => [...prev, ...newNotifs]);

        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => !newNotifs.some((nn) => nn.id === n.id)));
        }, 3000);
      }
    }
    prevSizeRef.current = collectedItems.size;
  }, [collectedItems, notifications]);

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        zIndex: 140,
        pointerEvents: "none",
      }}
    >
      {notifications.map((notif, i) => (
        <div
          key={notif.id}
          style={{
            background: "rgba(251, 191, 36, 0.15)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            backdropFilter: "blur(8px)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1.25rem",
            color: "#fbbf24",
            fontSize: "0.875rem",
            textAlign: "center",
            animation: `slideDown 0.3s ease-out ${i * 0.2}s both`,
          }}
        >
          <strong>{notif.name}</strong>
          <br />
          <span style={{ color: "#ccc", fontSize: "0.75rem" }}>
            {notif.description}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-1rem); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
