"use client";

import { useCallback, useRef, useState } from "react";

import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/chat-overlay.module.scss";
import type { ChatMessage } from "@/types";

const createMessage = (
  role: "user" | "assistant",
  content: string,
): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  role,
  content,
  timestamp: Date.now(),
});

export const ChatOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nearbyProject = useWorldStore((s) => s.nearbyProject);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");

    const userMsg = createMessage("user", trimmed);
    const assistantMsg = createMessage("assistant", "");
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const body: Record<string, unknown> = { messages: apiMessages };
      if (nearbyProject) {
        body["context"] = nearbyProject;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("요청에 실패했습니다.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림 불가");

      const decoder = new TextDecoder();
      let accumulated = "";
      let rafPending = false;

      const flushToState = () => {
        rafPending = false;
        const text = accumulated;
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          const last = updated[lastIdx];
          if (last && last.role === "assistant") {
            updated[lastIdx] = { ...last, content: text };
          }
          return updated;
        });
        scrollToBottom();
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(flushToState);
        }
      }

      // Flush any remaining text after stream ends
      if (rafPending) {
        cancelAnimationFrame(0);
      }
      flushToState();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, nearbyProject, scrollToBottom]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  if (!isOpen) {
    return (
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        💬
      </button>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          AI 어시스턴트
          {nearbyProject ? ` — ${nearbyProject}` : ""}
        </span>
        <button
          className={styles.closeBtn}
          onClick={() => setIsOpen(false)}
          type="button"
        >
          ×
        </button>
      </div>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${styles[msg.role]}`}
          >
            {msg.content || "..."}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="질문을 입력하세요..."
          disabled={isLoading}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          type="button"
        >
          전송
        </button>
      </div>
    </div>
  );
};
