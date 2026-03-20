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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const tenantId = localStorage.getItem('current_tenant_id') || ''

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/chat/sessions', {
        headers: { 'x-tenant-id': tenantId },
      })
      setSessions(data)
    } catch {
      // silently fail
    }
  }

  const fetchMessages = async (sessionId: string) => {
    try {
      const { data } = await api.get(`/chat/sessions/${sessionId}`)
      setMessages(data)
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    if (tenantId) fetchSessions()
  }, [tenantId])

  useEffect(() => {
    if (currentSessionId) fetchMessages(currentSessionId)
  }, [currentSessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewSession = async (): Promise<string | null> => {
    try {
      const { data } = await api.post(
        '/chat/sessions',
        { title: '새 대화' },
        { headers: { 'x-tenant-id': tenantId } },
      )
      setSessions((prev) => [data, ...prev])
      setCurrentSessionId(data.id)
      setMessages([])
      return data.id
    } catch {
      return null
    }
  }

  const handleSend = async (query: string) => {
    const sessionId = currentSessionId ?? await handleNewSession()
    if (!sessionId) return

    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: 'user', content: query, sources: [], createdAt: new Date().toISOString() },
    ])
    setIsLoading(true)

    try {
      const { data } = await api.post(
        `/chat/sessions/${sessionId}/messages`,
        { query },
        { headers: { 'x-tenant-id': tenantId } },
      )
      setMessages((prev) => [...prev.filter((m) => !m.id.startsWith('temp-')).concat(
        { id: `user-${Date.now()}`, role: 'user', content: query, sources: [], createdAt: new Date().toISOString() },
      ), data])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: '오류가 발생했습니다.', sources: [], createdAt: new Date().toISOString() },
      ])
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
