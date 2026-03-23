import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import styles from './ChatPage.module.scss'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Array<{ documentId: string; content: string; similarity: number }>
  createdAt: string
}

interface Session {
  id: string
  title: string
  updatedAt: string
}

export const ChatPage = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchSessions = async (signal?: AbortSignal) => {
    try {
      const { data } = await api.get('/chat/sessions', { signal })
      setSessions(data)
      setError(null)
    } catch (err) {
      if (signal?.aborted) return
      setError('세션 목록을 불러오는 중 오류가 발생했습니다.')
    }
  }

  const fetchMessages = async (sessionId: string, signal?: AbortSignal) => {
    try {
      const { data } = await api.get(`/chat/sessions/${sessionId}`, { signal })
      setMessages(data)
      setError(null)
    } catch (err) {
      if (signal?.aborted) return
      setError('메시지를 불러오는 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchSessions(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!currentSessionId) return
    const controller = new AbortController()
    fetchMessages(currentSessionId, controller.signal)
    return () => controller.abort()
  }, [currentSessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewSession = async (): Promise<string | null> => {
    try {
      const { data } = await api.post('/chat/sessions', { title: '새 대화' })
      setSessions((prev) => [data, ...prev])
      setCurrentSessionId(data.id)
      setMessages([])
      return data.id
    } catch {
      setError('새 세션을 생성하는 중 오류가 발생했습니다.')
      return null
    }
  }

  const handleSend = async (query: string) => {
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await handleNewSession()
      if (!sessionId) return
    }

    const tempId = `temp-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content: query, sources: [], createdAt: new Date().toISOString() },
    ])
    setIsLoading(true)
    setError(null)

    try {
      const { data } = await api.post(`/chat/sessions/${sessionId}/messages`, { query })
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        { id: `user-${Date.now()}`, role: 'user', content: query, sources: [], createdAt: new Date().toISOString() },
        data,
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.', sources: [], createdAt: new Date().toISOString() },
      ])
      setError('메시지 전송에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sessionList}>
        <button onClick={handleNewSession} className={styles.newSessionBtn}>
          + 새 대화
        </button>
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => { setCurrentSessionId(session.id); setMessages([]) }}
            className={`${styles.sessionItem} ${currentSessionId === session.id ? styles.activeSession : ''}`}
          >
            {session.title}
          </button>
        ))}
      </aside>

      <div className={styles.chatArea}>
        {error && <p style={{ color: 'var(--color-error)', padding: '0.5rem 1rem', margin: 0 }}>{error}</p>}
        <div className={styles.messageList}>
          {messages.length === 0 && (
            <div className={styles.emptyChat}>
              온보딩에 대해 무엇이든 물어보세요.
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  )
}
