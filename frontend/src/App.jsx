import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { MessageSquare, ListTodo, LogOut, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { gsap } from 'gsap';
import ChatView from './views/ChatView';
import TasksDashboard from './views/TasksDashboard';
import DocumentsView from './views/DocumentsView';
import LoginScreen from './components/LoginScreen';

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  
  const logoImgRef = useRef(null);
  const collapseIconRef = useRef(null);

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

  // GSAP Animation for Hover
  useEffect(() => {
    if (isCollapsed) {
      if (isHeaderHovered) {
        gsap.to(logoImgRef.current, { opacity: 0.25, filter: 'blur(3px)', duration: 0.3, ease: 'power2.out' });
        gsap.fromTo(collapseIconRef.current, 
          { scale: 0, opacity: 0, rotation: -45, display: 'flex' },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.7)' }
        );
      } else {
        gsap.to(logoImgRef.current, { opacity: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' });
        gsap.to(collapseIconRef.current, { 
          scale: 0, opacity: 0, rotation: 45, duration: 0.3, ease: 'power2.in',
          onComplete: () => gsap.set(collapseIconRef.current, { display: 'none' })
        });
      }
    } else {
      gsap.set(logoImgRef.current, { opacity: 1, filter: 'blur(0px)' });
    }
  }, [isHeaderHovered, isCollapsed]);

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
          className="flex flex-col shrink-0 h-full transition-all duration-300 ease-in-out"
          style={{
            width: isCollapsed ? '64px' : '200px',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          {/* Logo & Toggle Header */}
          <div
            className="flex items-center h-14 shrink-0 transition-all duration-200"
            style={{ 
              borderBottom: '1px solid var(--border)',
              padding: isCollapsed ? '0' : '0 1rem',
              justifyContent: isCollapsed ? 'center' : 'space-between'
            }}
          >
            {isCollapsed ? (
              <button 
                onClick={() => { setIsCollapsed(false); setIsHeaderHovered(false); }}
                onMouseEnter={() => setIsHeaderHovered(true)}
                onMouseLeave={() => setIsHeaderHovered(false)}
                className="w-full h-full flex items-center justify-center transition-all relative"
                title="Expandir menú"
              >
                <img
                  ref={logoImgRef}
                  src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/openclaw-color.png"
                  alt="OpenHandi logo"
                  className="w-7 h-7 rounded-md object-contain absolute z-0"
                  style={{ background: 'transparent' }}
                />
                <div ref={collapseIconRef} className="absolute z-10 hidden items-center justify-center">
                  <PanelLeftOpen className="w-5 h-5 text-[var(--text-primary)]" />
                </div>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img
                    src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/openclaw-color.png"
                    alt="OpenHandi logo"
                    className="w-6 h-6 rounded-md object-contain shrink-0"
                    style={{ background: 'transparent' }}
                  />
                  <span className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    OpenHandi
                  </span>
                </div>
                <button 
                  onClick={() => { setIsCollapsed(true); setIsHeaderHovered(false); }} 
                  className="shrink-0 p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Contraer menú"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Nav */}
          <nav className={`flex-1 flex flex-col gap-1 ${isCollapsed ? 'p-2 items-center' : 'p-3'}`}>
            {[
              { to: '/', end: true,  icon: <MessageSquare className="w-4 h-4 shrink-0" />, label: 'Chat' },
              { to: '/tasks', icon: <ListTodo className="w-4 h-4 shrink-0" />, label: 'Tareas' },
              { to: '/docs', icon: <FileText className="w-4 h-4 shrink-0" />, label: 'Documentos' },
            ].map(({ to, end, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex items-center rounded-lg text-sm font-medium transition-all duration-100',
                    isCollapsed ? 'justify-center w-10 h-10 p-0' : 'gap-2.5 px-3 py-2 w-full custom-nav-expanded',
                    isActive ? 'gb-card shadow-sm' : 'hover:bg-[var(--bg-elevated)]',
                  ].join(' ')
                }
                title={isCollapsed ? label : undefined}
                style={({ isActive }) => ({
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                })}
              >
                {icon}
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className={`shrink-0 flex flex-col gap-2 ${isCollapsed ? 'p-2 items-center' : 'p-3'}`} style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleLogout}
              className={`flex items-center rounded-lg text-sm font-medium transition-all duration-100 hover:bg-[var(--bg-elevated)] ${isCollapsed ? 'justify-center w-10 h-10 p-0' : 'gap-2.5 px-3 py-2 w-full'}`}
              style={{ color: 'var(--text-muted)' }}
              title={isCollapsed ? "Cerrar sesión" : undefined}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Cerrar sesión</span>}
            </button>

            {isCollapsed ? (
              <div className="w-10 h-6 flex items-center justify-center cursor-default" title="Sistema activo">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: 'var(--accent)' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent)' }} />
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 mt-1 cursor-default">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: 'var(--accent)' }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--accent)' }} />
                </span>
                <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--text-muted)' }}>Sistema activo</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          <Routes>
            <Route path="/" element={<ChatView />} />
            <Route path="/c/:id" element={<ChatView />} />
            <Route path="/tasks" element={<TasksDashboard />} />
            <Route path="/docs" element={<DocumentsView />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;
