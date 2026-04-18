import React, { useEffect, useState } from 'react';
import { X, Server, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TaskLogsModal({ taskId, onClose, apiUrl, token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/tasks/${taskId}/logs`, {
          headers: { 'x-assistant-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [taskId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="glass-panel w-full max-w-3xl max-h-[85vh] rounded-2xl flex flex-col relative z-10 animate-slide-up shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden bg-[#0A0D14]/90">
        
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Execution Logs</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-black/20">
          {loading ? (
            <div className="text-center py-10 text-white/50">Loading telemetry...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-white/50">No execution logs found for this task.</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3 font-mono text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={log.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white/40">{new Date(log.executed_at).toLocaleString()}</span>
                  </div>
                  
                  {log.output && (
                    <div className="text-white/70 whitespace-pre-wrap">{log.output}</div>
                  )}
                  {log.error && (
                    <div className="text-red-400/80 whitespace-pre-wrap bg-red-500/10 p-2 rounded">{log.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
