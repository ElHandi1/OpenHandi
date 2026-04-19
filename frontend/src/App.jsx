import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { MessageSquare, ListTodo, LogOut, Bot } from 'lucide-react';
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
          style={{ borderColor: 'var(--border-mid)', borderTopColor: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Iniciando...</span>
      </div>
    </div>
  );

  if (!authToken) return <LoginScreen onLogin={setAuthToken} />;

  const handleLogout = () => {
    localStorage.removeItem('openhandi_token');
    setAuthToken(null);
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

        {/* ── Side Rail ── */}
        <aside
          className="flex flex-col shrink-0 h-full"
          style={{
            width: '220px',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 px-4 h-14 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 2px 8px rgba(224,65,58,0.35)',
              }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              OpenHandi
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 flex flex-col gap-0.5">
            {[
              { to: '/', end: true,  icon: <MessageSquare className="w-4 h-4 shrink-0" />, label: 'Chat' },
              { to: '/tasks', icon: <ListTodo className="w-4 h-4 shrink-0" />, label: 'Tareas' },
            ].map(({ to, end, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full transition-all duration-100',
                    isActive ? 'gb-card' : '',
                  ].join(' ')
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.classList.contains('gb-card')) {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.classList.contains('gb-card')) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {icon}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full font-medium transition-all duration-100"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-elevated)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar sesion</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-2 mt-1">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                  style={{ background: 'var(--accent)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: 'var(--accent)' }} />
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sistema activo</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
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
