import { useState } from 'react'
import styles from '../ChatPage.module.scss'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
}

export const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return
    onSend(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.inputForm}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="온보딩에 대해 무엇이든 물어보세요..."
        disabled={isLoading}
        className={styles.input}
      />
      <button type="submit" disabled={isLoading || !message.trim()} className={styles.sendBtn}>
        {isLoading ? '...' : '전송'}
      </button>
    </form>
  )
}
