import { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, Trash2, Loader2, AlertCircle, Flag, Calendar, ChevronDown, ChevronUp, Upload, Download, X, Paperclip } from 'lucide-react';
import api, { downloadSecureFile } from '../../lib/api';
import ConfirmModal from '../ui/ConfirmModal';

const PRIORITY_STYLES = {
  high:   { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-900 border border-red-300/80 font-bold shadow-2xs',   label: 'High'   },
  normal: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-900 border border-amber-300/80 font-bold shadow-2xs', label: 'Normal' },
  low:    { dot: 'bg-teal-500',  badge: 'bg-teal-100 text-teal-900 border border-teal-300/80 font-bold shadow-2xs',  label: 'Low'    },
};

// ── Task file list sub-component ──────────────────────────────────────────────
const TaskFiles = ({ taskId, isDarkMode }) => {
  const [files, setFiles]         = useState(null); // null = not loaded yet
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const fileRef                   = useRef(null);

  const load = async () => {
    if (files !== null) return; // already loaded
    setLoading(true);
    try {
      const res = await api.get(`/api/student/tasks/${taskId}/files`);
      if (res.data.ok) setFiles(res.data.files);
    } catch { setError('Failed to load files.'); }
    finally { setLoading(false); }
  };

  // Auto-load when component mounts (task is expanded)
  useState(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/api/student/tasks/${taskId}/files`, fd);
      if (res.data.ok) setFiles(prev => [...(prev || []), res.data.file]);
    } catch (err) { setError(err.response?.data?.error || 'Upload failed.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleDelete = async (fileId) => {
    try {
      await api.delete(`/api/student/tasks/${taskId}/files/${fileId}`);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch { setError('Failed to delete file.'); }
  };

  return (
    <div className={`mt-3 pt-3 border-t space-y-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
      <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Attachments {files?.length ? `(${files.length})` : ''}
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading files…
        </div>
      ) : (files || []).length > 0 ? (
        <div className="space-y-1">
          {files.map(f => (
            <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <Paperclip className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <button
                onClick={() => downloadSecureFile(f.fileUrl, f.fileName)}
                className="flex-1 text-left truncate hover:text-teal-600 transition-colors font-medium text-xs"
                title={f.fileName}
              >
                {f.fileName}
              </button>
              <button
                onClick={() => downloadSecureFile(f.fileUrl, f.fileName)}
                className="p-1 rounded text-slate-400 hover:text-blue-500 transition-colors shrink-0"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(f.id)}
                className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors shrink-0"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No files attached.</p>
      )}

      {/* Upload button */}
      <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors border border-dashed ${
        isDarkMode
          ? 'border-slate-600 text-slate-400 hover:border-teal-500 hover:text-teal-400 hover:bg-teal-500/10'
          : 'border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50'
      }`}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Uploading…' : 'Attach file'}
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
};

// ── Main OverviewTab ──────────────────────────────────────────────────────────
const OverviewTab = ({ exams, tasks: initialTasks, archivedTasks: initialArchivedTasks }) => {
  const { isDarkMode } = useTheme();
  const [tasks, setTasks] = useState(initialTasks || []);
  const [archivedTasks, setArchivedTasks] = useState(initialArchivedTasks || []);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [newDueDate, setNewDueDate] = useState('');
  const [adding, setAdding] = useState(false);

  // Per-task loading states
  const [toggling, setToggling]   = useState({});
  const [deleting, setDeleting]   = useState({});
  const [archiving, setArchiving] = useState({});
  const [error, setError]         = useState('');
  const [deleteModal, setDeleteModal] = useState(null); // { id, isArchived, name }

  const card = `card-modern ${isDarkMode ? 'card-dark' : 'card-light'}`;
  const row  = isDarkMode ? 'list-row-dark' : 'list-row-light';

  // ── Add Task ──────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true); setError('');
    try {
      const res = await api.post('/api/student/tasks', { name: newName.trim(), priority: newPriority, dueDate: newDueDate || null });
      if (res.data.ok) {
        setTasks(prev => [...prev, res.data.task]);
        setNewName(''); setNewPriority('normal'); setNewDueDate('');
        setShowAdd(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add task.');
    } finally { setAdding(false); }
  };

  // ── Toggle Done (Optimistic UI Update with Rollback) ─────────────────────
  const handleToggle = async (id) => {
    // Optimistically toggle state in UI immediately
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    try {
      await api.put(`/api/student/tasks/${id}/toggle`, {});
    } catch {
      // Rollback on failure
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
      setError('Failed to update task. Changes reverted.');
    }
  };

  const confirmDeleteTask = async () => {
    if (!deleteModal) return;
    const { id, isArchived } = deleteModal;
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      await api.delete(`/api/student/tasks/${id}`);
      if (isArchived) setArchivedTasks(prev => prev.filter(t => t.id !== id));
      else setTasks(prev => prev.filter(t => t.id !== id));
      if (expandedTaskId === id) setExpandedTaskId(null);
      setDeleteModal(null);
    } catch { 
      setError('Failed to delete task.'); 
      setDeleteModal(null);
    }
    finally { setDeleting(d => ({ ...d, [id]: false })); }
  };

  const handleArchive = async (id) => {
    setArchiving(a => ({ ...a, [id]: true }));
    try {
      await api.put(`/api/student/tasks/${id}/archive`, {});
      const taskToArchive = tasks.find(t => t.id === id);
      setTasks(prev => prev.filter(t => t.id !== id));
      if (taskToArchive) setArchivedTasks(prev => [{ ...taskToArchive, archived: true }, ...prev]);
      if (expandedTaskId === id) setExpandedTaskId(null);
    } catch { setError('Failed to archive task.'); }
    finally { setArchiving(a => ({ ...a, [id]: false })); }
  };

  const toggleExpand = (id) => setExpandedTaskId(prev => prev === id ? null : id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* ── Exams ──────────────────────────────────────────────────────────── */}
      <div className={card}>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="text-3xl">📅</span> Course Exams
        </h2>
        {exams && exams.length > 0 ? (
          <div className="space-y-4">
            {exams.map(exam => (
              <div key={exam.id} className={`p-4 rounded-2xl border ${row}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{exam.name}</h3>
                    <p className="text-teal-600 font-semibold">{exam.courseCode}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      {exam.time ? ` · ${exam.time.slice(0, 5)}` : ''}
                    </p>
                    {exam.notes && <p className="text-xs text-slate-400 mt-1 italic">{exam.notes}</p>}
                  </div>
                  {exam.venue && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium shrink-0">
                      {exam.venue}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`p-10 rounded-2xl text-center border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-slate-500">No upcoming exams. Enjoy your free time! 🎉</p>
          </div>
        )}
      </div>

      {/* ── Tasks ──────────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">✅</span> Personal Tasks
          </h2>
          <button
            onClick={() => { setShowAdd(v => !v); setError(''); }}
            className="btn py-2 px-4 text-sm w-auto shadow-teal-500/30"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Add Task Form */}
        {showAdd && (
          <form onSubmit={handleAdd} className={`mb-4 p-4 rounded-2xl border-2 border-teal-200 ${isDarkMode ? 'bg-slate-800/60' : 'bg-teal-50/60'} space-y-3`}>
            <input
              autoFocus
              type="text"
              placeholder="Task name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-medium"
              required
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Flag className="w-3 h-3" /> Priority</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-teal-500 outline-none text-sm">
                  <option value="high">🔴 High</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Due Date</label>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-teal-500 outline-none text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={adding} className="btn flex-1 py-2 text-sm w-auto shadow-teal-500/30 disabled:opacity-60">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Task'}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setError(''); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map(task => {
              const ps       = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.normal;
              const isExpanded = expandedTaskId === task.id;
              return (
                <div key={task.id} className={`rounded-2xl border transition-all ${row} ${task.done ? 'opacity-60' : ''}`}>
                  {/* Row header — clickable to expand */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => toggleExpand(task.id)}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={e => { e.stopPropagation(); handleToggle(task.id); }}
                      disabled={toggling[task.id]}
                      className="shrink-0"
                      title={task.done ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {toggling[task.id]
                        ? <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                        : (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            task.done ? 'bg-teal-500 border-teal-500' : 'border-slate-300 hover:border-teal-400'
                          }`}>
                            {task.done && <span className="text-white text-xs">✓</span>}
                          </div>
                        )
                      }
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${task.done ? 'line-through text-slate-400' : ''}`}>
                        {task.name}
                      </p>
                      {task.dueDate && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    {/* Priority + Expand chevron */}
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ${ps.badge}`}>{ps.label}</span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    }

                    {/* Archive / Delete — stop propagation so they don't expand */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleArchive(task.id)}
                        disabled={archiving[task.id]}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        title="Archive task"
                      >
                        {archiving[task.id]
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        }
                      </button>
                      <button
                        onClick={() => setDeleteModal({ id: task.id, name: task.name, isArchived: false })}
                        disabled={deleting[task.id]}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete task"
                        aria-label={`Delete task ${task.name}`}
                      >
                        {deleting[task.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: file attachments */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <TaskFiles taskId={task.id} isDarkMode={isDarkMode} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`p-10 rounded-2xl text-center border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-slate-500">No tasks yet. Click <strong>Add Task</strong> to get started!</p>
          </div>
        )}

        {/* Archived Tasks */}
        {archivedTasks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              Task Archive
            </h3>
            <div className="space-y-2 opacity-70">
              {archivedTasks.map(task => {
                const ps = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.normal;
                return (
                  <div key={task.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${row}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{task.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${ps.badge}`}>{ps.label}</span>
                    <button
                      onClick={() => setDeleteModal({ id: task.id, name: task.name, isArchived: true })}
                      disabled={deleting[task.id]}
                      className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Permanently delete"
                      aria-label={`Permanently delete task ${task.name}`}
                    >
                      {deleting[task.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteModal}
        title="Delete Task?"
        message={`Are you sure you want to permanently delete "${deleteModal?.name}"?`}
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteModal(null)}
        type="danger"
      />
    </div>
  );
};

export default OverviewTab;
