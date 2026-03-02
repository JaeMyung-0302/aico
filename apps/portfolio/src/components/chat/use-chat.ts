"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/types";

interface UseChatReturn {
  readonly messages: readonly ChatMessage[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly sendMessage: (content: string) => Promise<void>;
  readonly clearMessages: () => void;
}

const createMessage = (
  role: "user" | "assistant",
  content: string,
): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  role,
  content,
  timestamp: Date.now(),
});

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<readonly ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      setError(null);

      const userMessage = createMessage("user", trimmed);
      const assistantMessage = createMessage("assistant", "");

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const allMessages = [...messagesRef.current, userMessage];
        const apiMessages = allMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error ?? "요청에 실패했습니다.");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });

          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            const last = updated[lastIdx];
            if (last && last.role === "assistant") {
              updated[lastIdx] = { ...last, content: accumulated };
            }
            return updated;
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        const errorMessage =
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        setError(errorMessage);

        setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  const clearMessages = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
};
