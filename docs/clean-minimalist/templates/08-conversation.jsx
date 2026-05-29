import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Inbox, AlertTriangle, Bot, User } from 'lucide-react'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-cm-accent/10' : 'bg-cm-text-secondary/10'}`}>
        {isUser ? <User className="w-4 h-4 text-cm-accent" /> : <Bot className="w-4 h-4 text-cm-text-secondary" />}
      </div>
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-xl px-4 py-2.5 text-sm ${
          isUser ? 'bg-cm-accent text-white' : 'bg-cm-surface border border-cm-border text-cm-text'
        }`}>
          {msg.content}
        </div>
        <span className="text-[0.6rem] text-cm-text-tertiary mt-1">{msg.time}</span>
      </div>
    </motion.div>
  )
}

export default function Conversation({ title = 'Chat', state = 'populated' }) {
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte?', time: '10:00' },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = () => {
    if (!input.trim()) return
    const userMsg = { id: Date.now().toString(), role: 'user', content: input, time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Gracias por tu mensaje. Estoy procesando la solicitud.', time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }])
    }, 800)
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col h-[600px] bg-cm-surface border border-cm-border rounded-xl">
        <div className="flex-1 p-4 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-cm-border" />
              <div className="h-12 w-48 bg-cm-border rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin conversación</h2>
        <p className="text-sm text-cm-text-secondary mt-1">Empieza a escribir para iniciar el chat.</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error de conexión</h2>
        <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-cm-text">{title}</h1>

      <div className="flex flex-col h-[600px] bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-cm-border p-4 flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3 py-2.5 bg-cm-bg border border-cm-border rounded-[--cm-radius-sm] text-sm text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent transition-colors"
          />
          <button onClick={send} disabled={!input.trim()} className="px-4 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] hover:bg-cm-accent-hover disabled:opacity-40 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
