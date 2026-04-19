import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Plus, MessageSquare, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatView() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const token = localStorage.getItem('openhandi_token') || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (activeSessionId) fetchHistory(activeSessionId);
    else setMessages([]);
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/sessions`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSessionId) setActiveSessionId(data[0].id);
      }
    } catch (e) {}
  };

  const fetchHistory = async (sessionId) => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/history?session_id=${sessionId}`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) setMessages(await res.json());
    } catch (e) {}
  };

  const createNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Eliminar esta conversacion?')) return;
    try {
      await fetch(`${apiUrl}/api/chat/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'x-assistant-token': token }
      });
      if (activeSessionId === id) setActiveSessionId(null);
      fetchSessions();
    } catch (e) {}
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-assistant-token': token },
        body: JSON.stringify({ message: userMessage, session_id: activeSessionId })
      });
      if (res.ok) {
        const data = await res.json();
        if (!activeSessionId && data.session_id) {
          setActiveSessionId(data.session_id);
          fetchSessions();
        }
        setMessages(prev => [...prev, { id: tempId + 1, role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { id: tempId + 1, role: 'assistant', content: 'Error de conexion con OpenHandi.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: tempId + 1, role: 'assistant', content: 'Error de sistema. Intenta de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const autoResize = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sessions Panel ── */}
      <div
        className="flex flex-col shrink-0 h-full"
        style={{
          width: '236px',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-4 h-14 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Conversaciones
          </span>
          <button
            onClick={createNewChat}
            title="Nueva conversacion"
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-100"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {sessions.length === 0 && (
            <p className="px-3 py-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Sin conversaciones
            </p>
          )}
          {sessions.map(s => {
            const isActive = activeSessionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-all duration-100 ${isActive ? 'gb-card' : ''}`}
                style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="text-xs truncate">{s.title}</span>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = '#ff8080'; }}
                  onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat Main ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-fade-in px-6">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl gb-elevated"
            >
              <Bot className="w-7 h-7" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                OpenHandi
              </p>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                Inicia una nueva conversacion
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {(messages.length > 0 || isLoading) && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-7 w-full">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-0.5 gb-card"
                    >
                      <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                  )}

                  <div
                    style={msg.role === 'user' ? {
                      border: '1px solid transparent',
                      background: `
                        linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box,
                        linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 50%, rgba(224,65,58,0.18) 100%) border-box
                      `,
                      color: 'var(--text-primary)',
                      borderRadius: '14px 14px 4px 14px',
                      padding: '10px 14px',
                      maxWidth: '78%',
                      fontSize: '0.9375rem',
                      lineHeight: '1.65',
                    } : {
                      color: 'var(--text-primary)',
                      maxWidth: '78%',
                      fontSize: '0.9375rem',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    ) : (
                      <div className="prose-minimal">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-0.5 gb-card"
                    >
                      <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 gb-card">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex items-center gap-1.5 py-2">
                    {[0, 120, 240].map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: 'var(--text-muted)', animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input bar */}
        <div
          className="shrink-0 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="gb-input flex items-center gap-3 p-3 rounded-2xl">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="Preguntale a OpenHandi..."
                disabled={isLoading}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{
                  color: 'var(--text-primary)',
                  minHeight: '24px',
                  maxHeight: '200px',
                  overflow: 'hidden',
                  caretColor: 'var(--accent)',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all duration-150 active:scale-95"
                style={{
                  background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: input.trim() && !isLoading ? '#fff' : 'var(--text-muted)',
                  boxShadow: input.trim() && !isLoading ? '0 2px 8px rgba(224,65,58,0.35)' : 'none',
                  opacity: isLoading ? 0.5 : 1,
                  border: '1px solid var(--border)',
                }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-center mt-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              OpenHandi · Minimax Core
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
