import { useState } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, Flag, Calendar } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || localStorage.getItem('supabase.auth.token');
};

const PRIORITY_STYLES = {
  high:   { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700',   label: 'High'   },
  normal: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', label: 'Normal' },
  low:    { dot: 'bg-teal-500',  badge: 'bg-teal-100 text-teal-700',  label: 'Low'    },
};

const OverviewTab = ({ isDarkMode, exams, tasks: initialTasks }) => {
  const [tasks, setTasks] = useState(initialTasks || []);

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [newDueDate, setNewDueDate] = useState('');
  const [adding, setAdding] = useState(false);

  // Per-task loading states
  const [toggling, setToggling] = useState({});
  const [deleting, setDeleting] = useState({});
  const [error, setError] = useState('');

  const card = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/80 shadow-md';
  const row  = isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100';

  // ── Add Task ──────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/student/tasks`,
        { name: newName.trim(), priority: newPriority, dueDate: newDueDate || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.ok) {
        setTasks(prev => [...prev, res.data.task]);
        setNewName(''); setNewPriority('normal'); setNewDueDate('');
        setShowAdd(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add task.');
    } finally {
      setAdding(false);
    }
  };

  // ── Toggle Done ───────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    setToggling(t => ({ ...t, [id]: true }));
    try {
      const token = await getToken();
      await axios.put(`${API_URL}/api/student/tasks/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    } catch {
      setError('Failed to update task.');
    } finally {
      setToggling(t => ({ ...t, [id]: false }));
    }
  };

  // ── Delete Task ───────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/api/student/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      setError('Failed to delete task.');
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* ── Exams ─────────────────────────────────────────────────────────── */}
      <div className={`p-8 rounded-3xl border ${card}`}>
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
          <div className={`p-10 rounded-2xl text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <p className="text-slate-500">No upcoming exams. Enjoy your free time! 🎉</p>
          </div>
        )}
      </div>

      {/* ── Tasks ─────────────────────────────────────────────────────────── */}
      <div className={`p-8 rounded-3xl border ${card}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">✅</span> Personal Tasks
          </h2>
          <button
            onClick={() => { setShowAdd(v => !v); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl text-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
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
              {/* Priority */}
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Flag className="w-3 h-3" /> Priority</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-teal-500 outline-none text-sm"
                >
                  <option value="high">🔴 High</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              {/* Due Date */}
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-teal-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={adding}
                className="flex-1 py-2 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Task'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setError(''); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map(task => {
              const ps = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.normal;
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${row} ${task.done ? 'opacity-60' : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(task.id)}
                    disabled={toggling[task.id]}
                    className="shrink-0"
                    title={task.done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {toggling[task.id]
                      ? <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                      : (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          task.done
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-slate-300 hover:border-teal-400'
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

                  {/* Priority Badge */}
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ${ps.badge}`}>
                    {ps.label}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={deleting[task.id]}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete task"
                  >
                    {deleting[task.id]
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`p-10 rounded-2xl text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <p className="text-slate-500">No tasks yet. Click <strong>Add Task</strong> to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewTab;
