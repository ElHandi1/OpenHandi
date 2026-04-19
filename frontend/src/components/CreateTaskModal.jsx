import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('0 9 * * *');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !schedule.trim()) return;

    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('openhandi_token') || '';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-token': token
        },
        body: JSON.stringify({ name, description, schedule })
      });

      if (!res.ok) {
        throw new Error('No se pudo crear la tarea.');
      }

      setName('');
      setDescription('');
      setSchedule('0 9 * * *');
      onTaskCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div 
        className="w-full max-w-md rounded-2xl relative shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva Tarea Cron</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && <div className="text-xs text-red-400 bg-red-950/20 p-2 rounded">{error}</div>}
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre de la tarea</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Resumen de IA Diario"
              className="gb-input px-3 py-2 text-sm rounded-lg outline-none w-full"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Descripción / Prompt (Misión del agente)</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="¿Qué debe investigar el agente en background?"
              rows={3}
              className="gb-input px-3 py-2 text-sm rounded-lg outline-none w-full resize-none"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Horario (Expresión Cron)</label>
            <input 
              type="text" 
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              placeholder="0 9 * * *"
              className="gb-input px-3 py-2 text-sm rounded-lg outline-none w-full"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', fontFamily: "'JetBrains Mono', monospace" }}
              required
            />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Por defecto: 0 9 * * * (Todos los días a las 9 AM)</span>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isLoading || !name || !description || !schedule}
              className="btn-primary w-full justify-center"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
