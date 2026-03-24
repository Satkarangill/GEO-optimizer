import { useState, useRef, useEffect } from 'react'
import './App.css'

const getApiBase = () => {
  const configured = (import.meta.env.VITE_API_URL || '').trim()
  if (!configured) return ''
  if (typeof window !== 'undefined') {
    const isLocalPage =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const pointsToLocalApi =
      configured.includes('localhost') || configured.includes('127.0.0.1')
    if (!isLocalPage && pointsToLocalApi) return ''
  }
  return configured.replace(/\/+$/, '')
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch(`${getApiBase()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      const reply = data.response || 'No response received.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}. Is the Node API running on port 3000?` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-app">
      <header className="chat-header">
        <h1>Gemini Expert Consultant</h1>
        <p>Ask anything — direct answers plus in-depth suggestions.</p>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-placeholder">
            Send a message to get started. The consultant will give a clear answer first, then suggestions and best practices.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message message--${msg.role}`}>
            <span className="message-label">{msg.role === 'user' ? 'You' : 'Consultant'}</span>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message message--assistant">
            <span className="message-label">Consultant</span>
            <div className="message-content message-loading">Consultant is typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrap">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question..."
          rows={2}
          disabled={loading}
        />
        <button
          type="button"
          className="chat-send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
