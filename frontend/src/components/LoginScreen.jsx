import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${apiUrl}/api/chat/verify`, {
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-token': token 
        }
      });
      if (res.ok) {
        localStorage.setItem('openhandi_token', token);
        onLogin(token);
      } else {
        setError(true);
        setToken('');
      }
    } catch (e) {
      setError(true);
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#030712] flex items-center justify-center p-4 z-50">
      {/* Background aesthetics */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-slate-900 to-cyan-900/10"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl relative z-10 animate-fade-in flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.3)] mb-6">
          <Lock className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Restricted Access</h1>
        <p className="text-white/50 text-center mb-8">Enter your personal assistant token to access the intelligence matrix.</p>
        
        <form onSubmit={handleSubmit} className="w-full relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
           <div className="relative flex items-center glass-panel rounded-2xl p-2 pl-4">
             <input
               type="password"
               value={token}
               onChange={(e) => {setToken(e.target.value); setError(false);}}
               placeholder="Secret Token"
               className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 px-2 py-2 w-full text-lg font-medium tracking-wider"
             />
             <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center w-12 h-12 !rounded-xl ml-2 shrink-0">
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Go'}
             </button>
           </div>
           {error && <p className="text-red-400 text-sm mt-4 text-center animate-fade-in font-medium">Invalid token. Access denied.</p>}
        </form>
      </div>
    </div>
  );
}
