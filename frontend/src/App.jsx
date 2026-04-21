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
  const sidebarRef = useRef(null);
  const ctxRef = useRef(null);
  const collapseIconRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // GSAP Sidebar Expand/Collapse Animation
  useEffect(() => {
    ctxRef.current = gsap.context(() => {}, sidebarRef);
    return () => ctxRef.current.revert();
  }, []);

  useEffect(() => {
    if (!ctxRef.current) return;
    
    ctxRef.current.add(() => {
      // Small timeout ensures React has finished swapping DOM elements (like icons) before GSAP targets them
      requestAnimationFrame(() => {
        if (isCollapsed) {
          gsap.to('.sidebar-label', { opacity: 0, duration: 0.15, ease: 'power1.inOut', overwrite: 'auto' });
          gsap.to(sidebarRef.current, { width: 56, duration: 0.25, delay: 0.15, ease: 'power2.inOut', overwrite: 'auto' });
        } else {
          gsap.to(sidebarRef.current, { width: 240, duration: 0.25, ease: 'power2.inOut', overwrite: 'auto' });
          gsap.to('.sidebar-label', { opacity: 1, duration: 0.15, delay: 0.25, ease: 'power1.inOut', overwrite: 'auto' });
        }
      });
    });
  }, [isCollapsed]);

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
        // Retrasamos la aparicion para que no buguee al cerrarse y pasar por el mouse
        gsap.to(logoImgRef.current, { opacity: 0.25, filter: 'blur(3px)', duration: 0.3, ease: 'power2.out', delay: 0.5 });
        gsap.fromTo(collapseIconRef.current, 
          { scale: 0, opacity: 0, rotation: -45, display: 'flex' },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.7)', delay: 0.5 }
        );
      } else {
        // Matamos cualquier animacion atrasada si saca el mouse antes de que pase el delay
        gsap.killTweensOf([logoImgRef.current, collapseIconRef.current]);
        
        gsap.to(logoImgRef.current, { opacity: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' });
        gsap.to(collapseIconRef.current, { 
          scale: 0, opacity: 0, rotation: 45, duration: 0.3, ease: 'power2.in',
          onComplete: () => gsap.set(collapseIconRef.current, { display: 'none' })
        });
      }
    } else {
      gsap.killTweensOf([logoImgRef.current, collapseIconRef.current]);
      gsap.set(logoImgRef.current, { opacity: 1, filter: 'blur(0px)' });
      gsap.set(collapseIconRef.current, { display: 'none' });
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
          ref={sidebarRef}
          className="flex flex-col shrink-0 h-full overflow-hidden relative w-[240px]"
          style={{
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          {/* Inner static container to prevent layout shifts */}
          <div className="w-[240px] flex flex-col h-full shrink-0">
            {/* Logo & Toggle Header */}
            <div
              className="flex items-center h-14 shrink-0 px-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                {isCollapsed ? (
                  <button 
                    onClick={() => { setIsCollapsed(false); setIsHeaderHovered(false); }}
                    onMouseEnter={() => setIsHeaderHovered(true)}
                    onMouseLeave={() => setIsHeaderHovered(false)}
                    className="w-full h-full flex items-center justify-center relative rounded hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    title="Expandir menú"
                  >
                    <img
                      ref={logoImgRef}
                      src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/openclaw-color.png"
                      alt="OpenHandi logo"
                      className="w-6 h-6 rounded-md object-contain absolute z-0"
                      style={{ background: 'transparent' }}
                    />
                    <div ref={collapseIconRef} className="absolute z-10 hidden items-center justify-center">
                      <PanelLeftOpen className="w-5 h-5 text-[var(--text-primary)]" />
                    </div>
                  </button>
                ) : (
                  <img
                    src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/openclaw-color.png"
                    alt="OpenHandi logo"
                    className="w-6 h-6 rounded-md object-contain shrink-0"
                    style={{ background: 'transparent' }}
                  />
                )}
              </div>

              <div className="sidebar-label flex items-center flex-1 justify-between pr-1 overflow-hidden opacity-100">
                <span className="font-semibold text-sm whitespace-nowrap px-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  OpenHandi
                </span>
                <button 
                  onClick={() => { setIsCollapsed(true); setIsHeaderHovered(false); }} 
                  className="shrink-0 p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Contraer menú"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 flex flex-col gap-1 py-3 px-2">
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
                    `flex items-center rounded-lg text-sm font-medium transition-colors w-full ${isActive ? 'bg-[var(--bg-elevated)] shadow-sm' : 'hover:bg-[var(--bg-elevated)]'}`
                  }
                  title={isCollapsed ? label : undefined}
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  })}
                >
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                    {icon}
                  </div>
                  <span className="sidebar-label opacity-100 whitespace-nowrap overflow-hidden text-ellipsis px-1.5">{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="shrink-0 flex flex-col gap-2 px-2 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleLogout}
                className="flex items-center rounded-lg text-sm font-medium transition-colors w-full hover:bg-[var(--bg-elevated)] cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
                title={isCollapsed ? "Cerrar sesión" : undefined}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <LogOut className="w-4 h-4 shrink-0" />
                </div>
                <span className="sidebar-label whitespace-nowrap overflow-hidden text-ellipsis px-1.5">Cerrar sesión</span>
              </button>

              <div className="flex items-center w-full mt-1 cursor-default">
                <div className="w-10 h-6 shrink-0 flex items-center justify-center" title="Sistema activo">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: 'var(--accent)' }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--accent)' }} />
                  </span>
                </div>
                <span className="sidebar-label text-xs whitespace-nowrap overflow-hidden text-ellipsis px-1.5" style={{ color: 'var(--text-muted)' }}>Sistema activo</span>
              </div>
            </div>
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
