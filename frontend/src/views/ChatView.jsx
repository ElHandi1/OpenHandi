import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Plus, MessageSquare, Trash2, MoreHorizontal } from 'lucide-react';
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
        if (data.length > 0 && !activeSessionId) {
          setActiveSessionId(data[0].id);
        }
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
    inputRef.current?.focus();
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
    const tempId = Date.now();

    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-token': token
        },
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
    } catch (error) {
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

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sessions Panel ── */}
      <div
        className="flex flex-col shrink-0 h-full overflow-hidden"
        style={{
          width: '240px',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Conversaciones
          </span>
          <button
            onClick={createNewChat}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100"
            style={{ color: 'var(--text-muted)' }}
            title="Nueva conversacion"
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {sessions.length === 0 && (
            <p className="px-3 py-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Sin conversaciones
            </p>
          )}
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className="group flex items-center justify-between w-full px-3 py-2 rounded-md text-left transition-all duration-100"
              style={{
                background: activeSessionId === s.id ? 'var(--bg-elevated)' : 'transparent',
                color: activeSessionId === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                if (activeSessionId !== s.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={e => {
                if (activeSessionId !== s.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="text-xs truncate">{s.title}</span>
              </div>
              <button
                onClick={(e) => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <Bot className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="text-center">
              <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                OpenHandi
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Inicia una conversacion
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {(messages.length > 0 || isLoading) && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6 w-full">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                  )}

                  <div
                    className="max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed"
                    style={msg.role === 'user' ? {
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      borderRadius: '12px 12px 4px 12px',
                    } : {
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      padding: 0,
                      border: 'none',
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
                      className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]"
                      style={{ background: 'var(--text-muted)' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:120ms]"
                      style={{ background: 'var(--text-muted)' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:240ms]"
                      style={{ background: 'var(--text-muted)' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ── Input Bar ── */}
        <div
          className="shrink-0 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 rounded-xl p-3 transition-all duration-150"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
              onFocusCapture={e => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onBlurCapture={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder="Preguntale a OpenHandi..."
                disabled={isLoading}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{
                  color: 'var(--text-primary)',
                  minHeight: '24px',
                  maxHeight: '200px',
                  overflow: 'hidden',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-100 active:scale-95"
                style={{
                  background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: input.trim() && !isLoading ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-center mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              OpenHandi · Minimax Core via OpenRouter
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
