import React, { useState } from 'react';
import { Lock, Loader2, Bot } from 'lucide-react';

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
      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)'
        }}
      />

      <div
        className="relative w-full max-w-sm mx-auto p-8 rounded-2xl animate-fade-in"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl"
            style={{ background: 'var(--accent)', border: '1px solid rgba(220,38,38,0.3)' }}
          >
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              OpenHandi
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Acceso restringido
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="token"
              className="text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Token de acceso
            </label>
            <div className="relative">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(false); }}
                placeholder="Ingresa tu token"
                className="input pl-9 w-full"
                autoFocus
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <p
              className="text-xs animate-fade-in px-3 py-2 rounded-lg"
              style={{
                color: '#fca5a5',
                background: 'rgba(252,165,165,0.06)',
                border: '1px solid rgba(252,165,165,0.15)',
              }}
            >
              Token invalido. Acceso denegado.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="btn-primary w-full justify-center mt-1 h-10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Continuar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
