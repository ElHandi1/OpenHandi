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

  const token = localStorage.getItem('openhandi_token') || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) fetchHistory(activeSessionId);
    else setMessages([]);
  }, [activeSessionId]);

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
    } catch(e) { console.error('Failed to fetch sessions'); }
  };

  const fetchHistory = async (sessionId) => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/history?session_id=${sessionId}`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch(e) {}
  };

  const createNewChat = async () => {
    setActiveSessionId(null);
    setMessages([]);
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
    
    // Optimistic UI update
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
        setMessages(prev => [...prev, { id: tempId + 1, role: 'assistant', content: 'Connection Error to OpenHandi Core.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: tempId + 1, role: 'assistant', content: 'System Error: Matrix Disconnected.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex h-full w-full relative pt-0">
      
      {/* Threads Sidebar */}
      <div className="w-64 border-r border-white/5 flex flex-col pt-4 shrink-0 bg-black/20">
        <div className="px-4 mb-4">
           <button onClick={createNewChat} className="btn-primary w-full flex items-center justify-center gap-2 py-2">
             <Plus className="w-4 h-4" /> New Chat
           </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1 modern-scrollbar">
           {sessions.map(s => (
             <div 
               key={s.id} 
               onClick={() => setActiveSessionId(s.id)}
               className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                 activeSessionId === s.id 
                 ? 'bg-purple-500/20 text-purple-200 border border-purple-500/10' 
                 : 'text-white/60 hover:bg-white/5 hover:text-white'
               }`}
             >
               <div className="flex items-center gap-2 overflow-hidden">
                 <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                 <span className="text-sm truncate font-medium">{s.title}</span>
               </div>
               <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1">
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
             </div>
           ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {messages.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50 pointer-events-none">
            <Bot className="w-20 h-20 text-purple-400 mb-6 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">Matrix Link Established</h2>
            <p className="text-white">Start a new secure session</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 modern-scrollbar space-y-6">
          <div className="max-w-3xl mx-auto space-y-8 w-full pb-10">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg backdrop-blur-sm mt-1">
                    <Bot className="w-5 h-5 text-purple-300" />
                  </div>
                )}
                
                <div className={`
                  max-w-[80%] rounded-3xl p-5 shadow-sm text-[15px] leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-gradient-to-br from-purple-600/80 to-indigo-600/80 text-white rounded-tr-sm backdrop-blur-md border border-purple-500/30 shadow-[0_4px_20px_rgba(168,85,247,0.15)]' 
                    : 'glass-panel rounded-tl-sm prose prose-invert max-w-none text-slate-200'}
                `}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-10 h-10 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm mt-1 shadow-lg">
                    <User className="w-5 h-5 text-white/70" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 items-start animate-fade-in">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse">
                  <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
                </div>
                <div className="glass-panel rounded-3xl rounded-tl-sm p-4 px-6 text-purple-200/70 border border-purple-500/20">
                  <div className="flex space-x-2">
                     <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                     <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                     <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 sm:p-6 sm:pt-2 w-full max-w-4xl mx-auto">
          <form onSubmit={sendMessage} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/30 to-cyan-600/30 rounded-[2rem] blur opacity-40 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center glass-panel rounded-[2rem] p-2 pl-6">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask OpenHandi anything..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 truncate" 
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="w-12 h-12 flex shrink-0 items-center justify-center rounded-2xl bg-white/5 hover:bg-white/15 disabled:opacity-50 transition-all ml-4 border border-white/10 disabled:cursor-not-allowed group-hover:border-purple-500/30"
              >
                <div className={`transition-transform duration-300 ${input.trim() ? 'translate-x-0 group-hover:scale-110 text-cyan-300' : '-translate-x-1 opacity-50'}`}>
                   <Send className="w-5 h-5" />
                </div>
              </button>
            </div>
            <div className="text-center mt-3 text-[10px] text-white/30 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
               <span className="w-2 h-2 rounded-full bg-cyan-500/50"></span> OpenRouter Minimáx Core
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
