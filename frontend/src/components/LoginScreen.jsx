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
        headers: { 'Content-Type': 'application/json', 'x-assistant-token': token }
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
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Soft radial vignette — muy sutil, no un halo de color */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(28,28,30,0.6) 0%, transparent 100%)',
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm mx-4 p-8 rounded-2xl animate-fade-in gb-elevated"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <img
            src="/login-logo.png"
            alt="OpenHandi logo"
            className="w-20 h-20 object-contain drop-shadow-xl"
          />
          <div className="text-center">
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
            >
              OpenHandi
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Acceso restringido
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="token-input"
              className="text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Token de acceso
            </label>

            {/* Input with gradient border on focus via gb-input wrapper */}
            <div className="gb-input flex items-center gap-2 px-3 py-2.5 rounded-xl">
              <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                id="token-input"
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(false); }}
                placeholder="Ingresa tu token"
                autoFocus
                autoComplete="current-password"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{
                  color: 'var(--text-primary)',
                  caretColor: 'var(--accent)',
                }}
              />
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs animate-fade-in"
              style={{
                color: '#ff8080',
                background: 'rgba(255, 128, 128, 0.07)',
                border: '1px solid rgba(255, 128, 128, 0.18)',
              }}
            >
              Token invalido. Acceso denegado.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="btn-primary w-full justify-center h-10 mt-1 rounded-xl"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : 'Continuar'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
