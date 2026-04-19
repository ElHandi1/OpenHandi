import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Save, Trash2, Edit3, AlignLeft, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DocumentsView() {
  const [docs, setDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);
  const token = localStorage.getItem('openhandi_token') || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/docs`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
        if (data.length > 0 && !activeDoc) {
          loadDoc(data[0].id);
        }
      }
    } catch (e) {}
  };

  useEffect(() => { fetchDocs(); }, []);

  const loadDoc = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/api/docs/${id}`, {
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveDoc(data.id);
        setTitle(data.title);
        setContent(data.content_markdown || '');
        setIsEditing(false);
      }
    } catch (e) {}
  };

  const activeDocMetadata = docs.find(d => d.id === activeDoc);

  const createDoc = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-assistant-token': token },
        body: JSON.stringify({ title: 'Nuevo Documento', content_markdown: '# Nuevo Documento' })
      });
      if (res.ok) {
        const data = await res.json();
        fetchDocs();
        loadDoc(data.id);
        setIsEditing(true);
      } else {
        const errData = await res.json();
        alert('Error creando el documento. ¿Añadiste la tabla SQL workspace_docs en Supabase? Detalle: ' + (errData.details || errData.error || 'Error Desconocido'));
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  const saveDoc = async () => {
    if (!activeDoc) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/docs/${activeDoc}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-assistant-token': token },
        body: JSON.stringify({ title, content_markdown: content })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchDocs();
      }
    } catch (e) {} finally {
      setIsSaving(false);
    }
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar documento de forma permanente?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/docs/${id}`, {
        method: 'DELETE',
        headers: { 'x-assistant-token': token }
      });
      if (res.ok) {
        if (activeDoc === id) {
          setActiveDoc(null);
          setContent('');
          setTitle('');
        }
        fetchDocs();
      }
    } catch (e) {}
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setContent(evt.target.result);
      if (file.name.endsWith('.md')) setTitle(file.name.replace('.md', ''));
      setIsEditing(true);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── Docs Panel ── */}
      <div 
        className="flex flex-col shrink-0 h-full"
        style={{ 
          width: '240px',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Documentos
          </span>
          <button 
            onClick={createDoc}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {docs.length === 0 && (
            <p className="px-3 py-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Sin documentos
            </p>
          )}
          {docs.map(doc => {
            const isActive = activeDoc === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => loadDoc(doc.id)}
                className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-all duration-100 ${isActive ? 'gb-card' : ''}`}
                style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                onMouseEnter={e => { 
                  if(!isActive) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }
                }}
                onMouseLeave={e => { 
                  if(!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="text-sm truncate font-medium">{doc.title}</span>
                </div>
                <button
                  onClick={(e) => deleteDoc(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                  title="Eliminar"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = '#ff8080'; }}
                  onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Editor Main ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!activeDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl gb-elevated">
              <AlignLeft className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Selecciona o crea un Documento</p>
          </div>
        ) : (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between px-6 h-14 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex-1 max-w-lg">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-transparent outline-none text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder="Título del documento..."
                  />
                ) : (
                  <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono mr-2" style={{ color: 'var(--text-muted)' }}>
                  ID: {activeDoc.split('-')[0]}
                </span>
                
                <input type="file" accept=".md,.txt" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="btn-outline mr-2" 
                  title="Subir archivo Markdown físico"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir Archivo
                </button>

                {isEditing ? (
                  <button onClick={saveDoc} disabled={isSaving} className="btn-primary">
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="btn-outline">
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-hidden flex">
              {isEditing ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="flex-1 p-8 bg-transparent outline-none resize-none"
                  style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                  placeholder="Escribe tu texto, copia de otra parte o usa el botón 'Subir Archivo' para cargar un .md..."
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-8 prose-minimal max-w-4xl mx-auto w-full animate-fade-in">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || '*Documento vacío*'}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
