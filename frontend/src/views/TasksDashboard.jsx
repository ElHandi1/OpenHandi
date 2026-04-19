import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Play, Trash2, Zap, Clock, Plus, RefreshCw, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskLogsModal from '../components/TaskLogsModal';

export default function TasksDashboard() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const token = localStorage.getItem('openhandi_token') || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/tasks`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) setTasks(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchTasks();
    const channel = supabase.channel('cron_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cron_tasks' }, () => fetchTasks())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const toggleTask = async (id, currentEnabled) => {
    try {
      await fetch(`${apiUrl}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-assistant-token': token },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      fetchTasks();
    } catch (e) {}
  };

  const runTaskNow = async (id) => {
    try {
      await fetch(`${apiUrl}/api/tasks/${id}/run`, {
        method: 'POST',
        headers: { 'x-assistant-token': token }
      });
    } catch (e) {}
  };

  const deleteTask = async (id) => {
    if (!confirm('Eliminar esta tarea para siempre?')) return;
    try {
      await fetch(`${apiUrl}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'x-assistant-token': token }
      });
      fetchTasks();
    } catch (e) {}
  };

  const statusConfig = {
    pending:  { label: 'Pendiente', cls: 'badge' },
    running:  { label: 'Ejecutando', cls: 'badge badge-running' },
    success:  { label: 'Exitoso', cls: 'badge badge-success' },
    error:    { label: 'Error', cls: 'badge badge-error' },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-8 h-14 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Cargas de Trabajo
          </h1>
          <span className="badge">{tasks.length} tareas</span>
        </div>
        <button className="btn-primary">
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 animate-fade-in">
            <Clock className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No hay tareas configuradas
            </p>
            <button className="btn-outline text-xs">
              <Plus className="w-3 h-3" /> Crear primera tarea
            </button>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nombre', 'Descripcion', 'Horario', 'Estado', 'Ultima ejecucion', 'Habilitado', ''].map(col => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => {
                const status = statusConfig[task.last_status] || statusConfig.pending;
                return (
                  <tr
                    key={task.id}
                    className="group transition-colors duration-100"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Name */}
                    <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {task.name}
                    </td>

                    {/* Description */}
                    <td className="px-6 py-3 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="truncate block max-w-[200px]">
                        {task.description || '—'}
                      </span>
                    </td>

                    {/* Schedule */}
                    <td className="px-6 py-3" style={{ color: 'var(--text-secondary)' }}>
                      <code
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          fontFamily: 'monospace',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {task.schedule}
                      </code>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-3">
                      <span className={status.cls}>
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {status.label}
                      </span>
                    </td>

                    {/* Last run */}
                    <td className="px-6 py-3 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {task.last_run
                        ? formatDistanceToNow(new Date(task.last_run), { addSuffix: true, locale: es })
                        : 'Nunca'}
                    </td>

                    {/* Toggle */}
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleTask(task.id, task.enabled)}
                        className="relative flex items-center w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
                        style={{
                          background: task.enabled ? 'var(--accent)' : 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                        }}
                      >
                        <span
                          className="absolute w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 shadow-sm"
                          style={{ transform: task.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => runTaskNow(task.id)}
                          className="btn-ghost p-1.5"
                          title="Ejecutar ahora"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedTask(task.id)}
                          className="btn-ghost p-1.5"
                          title="Ver registros"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="btn-ghost p-1.5"
                          title="Eliminar"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedTask && (
        <TaskLogsModal taskId={selectedTask} onClose={() => setSelectedTask(null)} apiUrl={apiUrl} token={token} />
      )}
    </div>
  );
}
