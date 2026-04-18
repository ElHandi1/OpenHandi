import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Database, Activity, LogOut } from 'lucide-react';
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
        } catch(e) {
          // Ignore network errors on init
        }
      }
      setLoading(false);
    };
    checkToken();
  }, [apiUrl]);

  if (loading) return (
    <div className="h-screen w-full bg-[#030712] flex flex-col items-center justify-center">
       <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
       <p className="text-white/50 animate-pulse">Initializing OpenHandi Matrix...</p>
    </div>
  );

  if (!authToken) {
    return <LoginScreen onLogin={setAuthToken} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('openhandi_token');
    setAuthToken(null);
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#030712] overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Sidebar */}
        <aside className="w-64 glass-panel border-r border-white/5 flex flex-col z-10 m-4 rounded-3xl overflow-hidden shrink-0">
          <div className="p-6 pb-2">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
              OpenHandi
            </h1>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider mt-1">Matrix Online</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                  isActive 
                  ? 'bg-gradient-to-r from-purple-500/20 to-transparent text-purple-300 border border-purple-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Chat</span>
            </NavLink>

            <NavLink
              to="/tasks"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                  isActive 
                  ? 'bg-gradient-to-r from-purple-500/20 to-transparent text-purple-300 border border-purple-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium">Cron Tasks</span>
            </NavLink>
          </nav>
          
          <div className="p-4 mt-auto">
             <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 w-full text-left font-medium">
               <LogOut className="w-5 h-5" />
               <span>Lock Matrix</span>
             </button>
             <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>
            <div className="flex items-center space-x-3 px-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">System Online</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative z-10 m-4 ml-0 overflow-hidden rounded-3xl glass-panel">
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
