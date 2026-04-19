import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { MessageSquare, Activity, LogOut, Bot } from 'lucide-react';
import ChatView from './views/ChatView';
import TasksDashboard from './views/TasksDashboard';
import LoginScreen from './components/LoginScreen';

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const checkToken = async () => {
      const stored = localStorage.getItem('openhandi_token');
      if (stored) {
        try {
          const res = await fetch(`${apiUrl}/api/chat/verify`, {
            headers: { 'x-assistant-token': stored }
          });
          if (res.ok) setAuthToken(stored);
          else localStorage.removeItem('openhandi_token');
        } catch (e) {}
      }
      setLoading(false);
    };
    checkToken();
  }, [apiUrl]);

  if (loading) return (
    <div style={{ background: 'var(--bg-base)' }} className="h-screen w-full flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Iniciando...</span>
      </div>
    </div>
  );

  if (!authToken) {
    return <LoginScreen onLogin={setAuthToken} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('openhandi_token');
    setAuthToken(null);
  };

  const navItem = ({ isActive }) => [
    'relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium w-full transition-all duration-100',
    isActive
      ? 'text-[var(--text-primary)] bg-[var(--bg-elevated)]'
      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]'
  ].join(' ');

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

        {/* ── Side Rail ── */}
        <aside
          className="flex flex-col shrink-0 h-full"
          style={{
            width: '220px',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-base)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-4 h-14 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-center w-7 h-7 rounded-md"
              style={{ background: 'var(--accent)' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
              OpenHandi
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
            <NavLink to="/" end className={navItem}>
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Chat</span>
            </NavLink>
            <NavLink to="/tasks" className={navItem}>
              <Activity className="w-4 h-4 shrink-0" />
              <span>Tareas</span>
            </NavLink>
          </nav>

          {/* Footer */}
          <div className="p-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full font-medium transition-all duration-100"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar sesion</span>
            </button>

            {/* Status pill */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: 'var(--accent)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: 'var(--accent)' }} />
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sistema activo</span>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <Routes>
            <Route path="/" element={<ChatView />} />
            <Route path="/tasks" element={<TasksDashboard />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;
