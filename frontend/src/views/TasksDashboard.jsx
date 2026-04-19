import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Zap, Clock, Plus, RefreshCw, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskLogsModal from '../components/TaskLogsModal';
import CreateTaskModal from '../components/CreateTaskModal';

export default function TasksDashboard() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    pending: { label: 'Pendiente', cls: 'badge' },
    running: { label: 'Ejecutando', cls: 'badge badge-running' },
    success: { label: 'Exitoso',   cls: 'badge badge-success' },
    error:   { label: 'Error',     cls: 'badge badge-error' },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-8 h-14 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
          >
            Cargas de Trabajo
          </h1>
          <span className="badge">{tasks.length} tareas</span>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
          <Plus className="w-3.5 h-3.5" />
          Nueva tarea
        </button>
      </div>

      {/* ── Empty state ── */}
      {tasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-2xl gb-elevated"
          >
            <Clock className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Sin tareas configuradas
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Crea tu primera tarea automatizada
            </p>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-outline text-xs">
            <Plus className="w-3.5 h-3.5" /> Crear tarea
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-surface)' }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nombre', 'Descripcion', 'Horario', 'Estado', 'Ultima ejecucion', 'Activo', ''].map(col => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left font-medium"
                    style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.04em' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const status = statusConfig[task.last_status] || statusConfig.pending;
                return (
                  <tr
                    key={task.id}
                    className="group transition-colors duration-100"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Name */}
                    <td className="px-6 py-3.5 font-medium" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {task.name}
                    </td>

                    {/* Description */}
                    <td className="px-6 py-3.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="block max-w-[200px] truncate text-[13px]">
                        {task.description || '—'}
                      </span>
                    </td>

                    {/* Schedule */}
                    <td className="px-6 py-3.5">
                      <code
                        className="px-2 py-0.5 rounded-md text-xs"
                        style={{
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          letterSpacing: 0,
                        }}
                      >
                        {task.schedule}
                      </code>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-3.5">
                      <span className={status.cls}>
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {status.label}
                      </span>
                    </td>

                    {/* Last run */}
                    <td className="px-6 py-3.5 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {task.last_run
                        ? formatDistanceToNow(new Date(task.last_run), { addSuffix: true, locale: es })
                        : 'Nunca'}
                    </td>

                    {/* Toggle */}
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => toggleTask(task.id, task.enabled)}
                        className="relative flex items-center w-9 h-5 rounded-full shrink-0 transition-all duration-200"
                        style={{
                          background: task.enabled ? 'var(--accent)' : 'var(--bg-elevated)',
                          border: '1px solid var(--border-mid)',
                          boxShadow: task.enabled ? '0 1px 6px rgba(224,65,58,0.3)' : 'none',
                        }}
                      >
                        <span
                          className="absolute w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 shadow-sm"
                          style={{ transform: task.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => runTaskNow(task.id)}
                          className="btn-ghost p-1.5 rounded-lg"
                          title="Ejecutar ahora"
                          style={{ padding: '6px' }}
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedTask(task.id)}
                          className="btn-ghost p-1.5 rounded-lg"
                          title="Ver registros"
                          style={{ padding: '6px' }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="btn-ghost p-1.5 rounded-lg"
                          title="Eliminar"
                          style={{ padding: '6px', color: 'var(--text-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ff8080'}
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
        </div>
      )}

      {selectedTask && (
        <TaskLogsModal
          taskId={selectedTask}
          onClose={() => setSelectedTask(null)}
          apiUrl={apiUrl}
          token={token}
        />
      )}

      {/* Creation Modal */}
      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onTaskCreated={fetchTasks} 
      />
    </div>
  );
}
