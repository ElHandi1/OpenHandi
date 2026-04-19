import React, { useEffect, useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TaskLogsModal({ taskId, onClose, apiUrl, token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${taskId}/logs`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) setLogs(await res.json());
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [taskId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl animate-slide-up overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Registros de Ejecucion
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="btn-ghost p-1.5"
              title="Actualizar"
              style={{ padding: '6px' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="btn-ghost p-1.5"
              style={{ padding: '6px' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Cargando registros...</span>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
              <Server className="w-6 h-6" />
              <p className="text-sm">Sin registros de ejecucion para esta tarea</p>
            </div>
          )}

          {!loading && logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg overflow-hidden animate-fade-in"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Log header */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#86efac' }} />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" style={{ color: '#fca5a5' }} />
                  )}
                  <span
                    className="text-xs font-medium tracking-wide uppercase"
                    style={{ color: log.status === 'success' ? '#86efac' : '#fca5a5' }}
                  >
                    {log.status === 'success' ? 'Exitoso' : 'Error'}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {log.executed_at
                    ? formatDistanceToNow(new Date(log.executed_at), { addSuffix: true, locale: es })
                    : '—'}
                </span>
              </div>

              {/* Log content */}
              {(log.output || log.error) && (
                <div className="p-4">
                  {log.output && (
                    <pre
                      className="text-xs leading-relaxed whitespace-pre-wrap break-words"
                      style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}
                    >
                      {log.output}
                    </pre>
                  )}
                  {log.error && (
                    <pre
                      className="text-xs leading-relaxed whitespace-pre-wrap break-words mt-2"
                      style={{
                        color: '#fca5a5',
                        fontFamily: 'monospace',
                        background: 'rgba(252,165,165,0.05)',
                        border: '1px solid rgba(252,165,165,0.1)',
                        borderRadius: '6px',
                        padding: '0.5rem',
                      }}
                    >
                      {log.error}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
