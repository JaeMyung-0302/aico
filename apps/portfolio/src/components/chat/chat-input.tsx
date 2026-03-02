"use client";

import { useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import styles from "@/styles/chat-input.module.scss";

const MAX_LENGTH = 1000;

const SUGGESTIONS = [
  "어떤 프로젝트를 만들었나요?",
  "기술 스택이 궁금해요",
  "가장 도전적인 프로젝트는?",
];

interface ChatInputProps {
  readonly onSend: (message: string) => void;
  readonly isLoading: boolean;
  readonly showSuggestions?: boolean;
}

const ChatInput = ({
  onSend,
  isLoading,
  showSuggestions = false,
}: ChatInputProps) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || isLoading) return;
      onSend(trimmed);
      setValue("");
      inputRef.current?.focus();
    },
    [value, isLoading, onSend],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      onSend(suggestion);
    },
    [onSend],
  );

  return (
    <div className={styles.container}>
      {showSuggestions && (
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.suggestion}
              onClick={() => handleSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.textarea}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="AI에게 질문해보세요..."
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? "..." : "전송"}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
