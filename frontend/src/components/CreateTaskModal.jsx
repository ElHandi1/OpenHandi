import React, { useState, useEffect } from 'react';
import { X, Loader2, Users, FileText, Settings, Bot } from 'lucide-react';

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('0 */4 * * *');
  const [scheduleLabel, setScheduleLabel] = useState('Cada 4 horas');
  const [taskType, setTaskType] = useState('simple');
  const [docId, setDocId] = useState('');
  
  const [docs, setDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('openhandi_token') || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen && taskType === 'society') {
      fetch(`${apiUrl}/api/docs`, { headers: { 'x-assistant-token': token } })
        .then(res => res.json())
        .then(data => {
          setDocs(data);
          if(data.length > 0 && !docId) setDocId(data[0].id);
        })
        .catch(console.error);
    }
  }, [isOpen, taskType]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !schedule.trim()) return;

    setIsLoading(true);
    setError(null);

    const payload = { 
      name, 
      description, 
      schedule,
      task_type: taskType,
      doc_id: taskType === 'society' ? docId : null
    };

    try {
      const res = await fetch(`${apiUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-assistant-token': token },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('No se pudo crear la tarea.');

      setName('');
      setDescription('');
      setSchedule('0 */4 * * *');
      setScheduleLabel('Cada 4 horas');
      setTaskType('simple');
      setDocId('');
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
          
          <div className="flex bg-black/20 p-1 rounded-xl" style={{ border: '1px solid var(--border)' }}>
             <button
               type="button"
               onClick={() => setTaskType('simple')}
               className={`flex-1 flex items-center justify-center gap-2 text-xs py-2 rounded-lg font-medium transition-all ${taskType === 'simple' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Bot className="w-3.5 h-3.5" /> 1 Agente
             </button>
             <button
               type="button"
               onClick={() => setTaskType('society')}
               className={`flex-1 flex items-center justify-center gap-2 text-xs py-2 rounded-lg font-medium transition-all ${taskType === 'society' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Users className="w-3.5 h-3.5" /> 3 Agentes (Sociedad)
             </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre de la tarea</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Resumen de Web3 Hackathons"
              className="gb-input px-3 py-2 text-sm rounded-lg outline-none w-full"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Misión</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={taskType === 'society' ? "Investiga tendencias Web3, escribe tips para el juez, y audita." : "¿Qué debe investigar el agente?"}
              rows={3}
              className="gb-input px-3 py-2 text-sm rounded-lg outline-none w-full resize-none"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              required
            />
          </div>

          {taskType === 'society' && (
             <div className="flex flex-col gap-1.5 animate-slide-up">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <FileText className="w-3.5 h-3.5" /> Documento a Modificar
              </label>
              <select 
                value={docId}
                onChange={e => setDocId(e.target.value)}
                className="gb-input px-3 py-2 text-sm rounded-lg outline-none w-full"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', appearance: 'none' }}
                required={taskType === 'society'}
              >
                <option value="" disabled>Selecciona un Documento MD...</option>
                {docs.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
             </div>
          )}

          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
               <Settings className="w-3 h-3" /> Frecuencia de ejecución
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Cada hora',    cron: '0 * * * *'    },
                { label: 'Cada 2 horas', cron: '0 */2 * * *'  },
                { label: 'Cada 4 horas', cron: '0 */4 * * *'  },
                { label: 'Cada 8 horas', cron: '0 */8 * * *'  },
                { label: 'Cada 12 h',   cron: '0 */12 * * *' },
                { label: 'Cada día',     cron: '0 9 * * *'    },
                { label: 'Lunes 9AM',    cron: '0 9 * * 1'    },
                { label: 'Cada semana',  cron: '0 9 * * 0'    },
                { label: 'Cada mes',     cron: '0 9 1 * *'    },
              ].map(opt => (
                <button
                  key={opt.cron}
                  type="button"
                  onClick={() => { setSchedule(opt.cron); setScheduleLabel(opt.label); }}
                  className="py-2 px-3 rounded-lg text-xs font-medium transition-all text-left"
                  style={{
                    background: schedule === opt.cron ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: schedule === opt.cron ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${schedule === opt.cron ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              cron: <span style={{ color: 'var(--text-secondary)' }}>{schedule}</span>
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isLoading || !name || !description || !schedule || (taskType === 'society' && !docId)}
              className="btn-primary w-full justify-center"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Orquestación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
