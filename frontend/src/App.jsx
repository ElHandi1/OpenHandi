import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { MessageSquare, LayoutDashboard } from 'lucide-react';
import ChatView from './views/ChatView';
import TasksDashboard from './views/TasksDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-20 md:w-64 flex-shrink-0 glass-panel border-r border-y-0 border-l-0 z-20 flex flex-col items-center md:items-start p-4 md:p-6 transition-all duration-300">
          <div className="flex items-center gap-3 mb-10 w-full justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="hidden md:block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 font-semibold text-lg tracking-wide">
              OpenHandi
            </span>
          </div>

          <nav className="flex flex-col gap-3 w-full">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-white/10 shadow-inner border border-white/5' : 'hover:bg-white/5'}`
              }
            >
              <MessageSquare className="w-5 h-5 text-white/70 group-hover:text-white group-[.active]:text-purple-400 transition-colors" />
              <span className="hidden md:block font-medium text-white/70 group-hover:text-white group-[.active]:text-white">Chat</span>
            </NavLink>
            
            <NavLink 
              to="/tasks" 
              className={({ isActive }) => 
                `flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-white/10 shadow-inner border border-white/5' : 'hover:bg-white/5'}`
              }
            >
              <LayoutDashboard className="w-5 h-5 text-white/70 group-hover:text-white group-[.active]:text-cyan-400 transition-colors" />
              <span className="hidden md:block font-medium text-white/70 group-hover:text-white group-[.active]:text-white">Cron Tasks</span>
            </NavLink>
          </nav>

          <div className="mt-auto hidden md:block">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow"></span>
                <span className="text-sm text-white/80">System Online</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<ChatView />} />
            <Route path="/tasks" element={<TasksDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
