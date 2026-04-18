import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Bot, User } from 'lucide-react';

export default function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  
  const token = import.meta.env.VITE_ASSISTANT_TOKEN || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/history`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, id: Date.now() }]);
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-token': token
        },
        body: JSON.stringify({ message: userMsg })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response, id: Date.now() + 1 }]);
      } else {
        console.error('API Error', await res.text());
      }
    } catch (e) {
      console.error('Request failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="absolute inset-0 max-w-4xl mx-auto flex flex-col pt-8 pb-4 px-4 sm:px-6 z-10 w-full">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between glass-panel px-6 py-4 rounded-2xl animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
              OpenHandi Personal Assistant
            </h1>
            <p className="text-sm text-white/50 mt-1">Ready to orchestrate your tasks.</p>
          </div>
          <Bot className="w-8 h-8 text-cyan-400" />
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto mb-6 px-2 pr-4 flex flex-col gap-6 custom-scrollbar">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white/40 text-lg">No conversation history. Send a message to start.</p>
            </div>
          )}
          
          {messages.map((m, i) => {
            const isAsst = m.role === 'assistant';
            return (
              <div key={m.id || i} className={`flex gap-4 p-5 rounded-2xl animate-slide-up ${isAsst ? 'glass-card mr-12' : 'bg-purple-600/20 border border-purple-500/30 ml-12'}`}>
                <div className="flex-shrink-0 mt-1">
                  {isAsst ? <Bot className="w-6 h-6 text-cyan-400" /> : <User className="w-6 h-6 text-purple-400" />}
                </div>
                <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 max-w-none text-white/90 text-sm sm:text-base">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div className="flex gap-4 p-5 rounded-2xl glass-card mr-12 mr-auto w-[120px] items-center justify-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          )}
          
          <div ref={endRef} className="h-4" />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="relative mt-auto animate-fade-in group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
          <div className="relative flex items-center glass-panel rounded-2xl p-2 pl-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask OpenHandi anything..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 text-lg py-2"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="btn-primary flex items-center justify-center w-12 h-12 !rounded-xl ml-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
