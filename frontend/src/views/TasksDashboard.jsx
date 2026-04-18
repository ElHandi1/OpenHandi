import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Play, Pause, Trash2, Zap, Clock, Plus, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TaskLogsModal from '../components/TaskLogsModal';

export default function TasksDashboard() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const token = import.meta.env.VITE_ASSISTANT_TOKEN || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/tasks`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Supabase Realtime Subscription for dynamic updates
    const channel = supabase.channel('cron_tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cron_tasks' },
        (payload) => {
          console.log('Task changed:', payload);
          fetchTasks(); // Reload to keep simple, or could patch state directly
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleTask = async (id, currentEnabled) => {
    try {
      await fetch(`${apiUrl}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-assistant-token': token },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      fetchTasks();
    } catch (e) { console.error(e); }
  };

  const runTaskNow = async (id) => {
    try {
      await fetch(`${apiUrl}/api/tasks/${id}/run`, {
        method: 'POST',
        headers: { 'x-assistant-token': token }
      });
      // realtime will naturally update status to running
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task forever?')) return;
    try {
      await fetch(`${apiUrl}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'x-assistant-token': token }
      });
      fetchTasks();
    } catch (e) { console.error(e); }
  };

  const getStatusBadge = (status) => {
    const states = {
      pending: 'bg-white/10 text-white/70 border-white/20',
      running: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return `px-3 py-1 rounded-full text-xs font-semibold border ${states[status] || states.pending} uppercase tracking-wider backdrop-blur-md`;
  };

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Cron Workloads</h1>
            <p className="text-white/50">Manage your autonomous background functions</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
             <div key={task.id} className="glass-card p-6 flex flex-col relative group overflow-hidden">
               {/* Ambient Glow */}
               <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 transition-all duration-700 ${task.last_status === 'running' ? 'bg-blue-500 opacity-50' : task.last_status === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
               
               <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                 <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors truncate pr-4">{task.name}</h3>
                 <div className="flex-shrink-0">
                  <button 
                    onClick={() => toggleTask(task.id, task.enabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${task.enabled ? 'bg-purple-500' : 'bg-white/10'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full transition-transform absolute ${task.enabled ? 'translate-x-7' : 'translate-x-1'}`}></span>
                  </button>
                 </div>
               </div>

               <p className="text-white/60 text-sm mb-6 flex-1">{task.description || 'No description provided.'}</p>
               
               <div className="space-y-4 mb-6 relative z-10">
                 <div className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2 text-white/50 font-mono bg-black/30 px-2 py-1 rounded w-fit border border-white/5 text-xs">
                     <Clock className="w-3 h-3" /> {task.schedule}
                   </div>
                   {getStatusBadge(task.last_status || 'pending')}
                 </div>
                 
                 <div className="text-xs text-white/40">
                   Last Run: {task.last_run ? formatDistanceToNow(new Date(task.last_run), {addSuffix: true}) : 'Never'}
                 </div>
               </div>

               <div className="flex gap-2 mt-auto relative z-10 border-t border-white/10 pt-4">
                 <button 
                  onClick={() => runTaskNow(task.id)}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 py-1.5 text-sm hover:!bg-blue-500/20 hover:!text-blue-400 hover:!border-blue-500/30"
                  title="Run Node-Cron Now"
                 >
                   <Zap className="w-4 h-4" /> Run
                 </button>
                 <button 
                  onClick={() => setSelectedTask(task.id)}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 py-1.5 text-sm"
                 >
                   <RefreshCw className="w-4 h-4" /> Logs
                 </button>
                 <button 
                  onClick={() => deleteTask(task.id)}
                  className="btn-secondary !px-3 hover:!bg-red-500/20 hover:!text-red-400 hover:!border-red-500/30"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
             </div>
          ))}

          {tasks.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center glass-panel rounded-2xl border-dashed border-2 border-white/20">
              <Clock className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-white/50 text-lg">No automated workloads configured yet.</p>
            </div>
          )}
        </div>

      </div>

      {selectedTask && (
        <TaskLogsModal taskId={selectedTask} onClose={() => setSelectedTask(null)} apiUrl={apiUrl} token={token} />
      )}
    </div>
  );
}
