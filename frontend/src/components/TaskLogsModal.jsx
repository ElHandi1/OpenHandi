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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[78vh] flex flex-col rounded-2xl animate-slide-up overflow-hidden gb-elevated"
        style={{
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            >
              Registros de Ejecucion
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchLogs}
              className="btn-ghost rounded-lg"
              title="Actualizar"
              style={{ padding: '6px' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="btn-ghost rounded-lg"
              style={{ padding: '6px' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-2"
          style={{ background: 'var(--bg-surface)' }}
        >
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-14 gap-2.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Cargando registros...</span>
            </div>
          )}

          {/* Empty */}
          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 gap-3" style={{ color: 'var(--text-muted)' }}>
              <Server className="w-7 h-7" />
              <p className="text-sm">Sin registros para esta tarea</p>
            </div>
          )}

          {/* Log entries */}
          {!loading && logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl overflow-hidden animate-fade-in gb-card"
            >
              {/* Log header row */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#7ee8a2' }} />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" style={{ color: '#ff8080' }} />
                  )}
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: log.status === 'success' ? '#7ee8a2' : '#ff8080' }}
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

              {/* Log body */}
              {(log.output || log.error) && (
                <div className="p-4 flex flex-col gap-2" style={{ background: 'var(--bg-surface)' }}>
                  {log.output && (
                    <pre
                      className="text-xs leading-relaxed whitespace-pre-wrap break-words"
                      style={{
                        color: 'var(--text-secondary)',
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      }}
                    >
                      {log.output}
                    </pre>
                  )}
                  {log.error && (
                    <pre
                      className="text-xs leading-relaxed whitespace-pre-wrap break-words p-3 rounded-lg"
                      style={{
                        color: '#ff8080',
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        background: 'rgba(255,128,128,0.06)',
                        border: '1px solid rgba(255,128,128,0.14)',
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
