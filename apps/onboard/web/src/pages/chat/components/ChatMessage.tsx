import styles from '../ChatPage.module.scss'

interface Source {
  documentId: string
  content: string
  similarity: number
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

export const ChatMessage = ({ role, content, sources }: ChatMessageProps) => {
  return (
    <div className={`${styles.message} ${role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
      <div className={styles.messageContent}>{content}</div>
      {sources && sources.length > 0 && (
        <div className={styles.sources}>
          <span className={styles.sourcesLabel}>참고 문서 {sources.length}건</span>
        </div>
      )}
    </div>
  )
}
