"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@/components/chat/use-chat";
import ChatMessageBubble from "@/components/chat/chat-message";
import ChatInput from "@/components/chat/chat-input";
import styles from "@/styles/chat-panel.module.scss";

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={togglePanel}
        aria-label={isOpen ? "채팅 닫기" : "AI에게 질문하기"}
      >
        {isOpen ? "\u2715" : "\ud83d\udcac"}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3 className={styles.headerTitle}>AI 포트폴리오 어시스턴트</h3>
            {messages.length > 0 && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearMessages}
              >
                초기화
              </button>
            )}
          </div>

          <div className={styles.messageList}>
            {messages.length === 0 && (
              <p className={styles.placeholder}>
                안녕하세요! 프로젝트, 기술 스택, 경력에 대해 질문해보세요.
              </p>
            )}
            {messages.map((msg, idx) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                isStreaming={
                  isLoading &&
                  idx === messages.length - 1 &&
                  msg.role === "assistant"
                }
              />
            ))}
            {error && <p className={styles.error}>{error}</p>}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            showSuggestions={messages.length === 0}
          />
        </div>
      )}
    </>
  );
};

export default ChatPanel;
