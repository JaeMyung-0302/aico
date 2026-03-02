"use client";

import type { ChatMessage } from "@/types";
import styles from "@/styles/chat-message.module.scss";

interface ChatMessageProps {
  readonly message: ChatMessage;
  readonly isStreaming?: boolean;
}

const ChatMessageBubble = ({
  message,
  isStreaming = false,
}: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}
    >
      <div className={styles.bubble}>
        {message.content || (isStreaming && <span className={styles.typing} />)}
      </div>
    </div>
  );
};

export default ChatMessageBubble;
