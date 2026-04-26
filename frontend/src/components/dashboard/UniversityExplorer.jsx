import React, { useState } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, BookOpen, Users, Crown, X, Save, Loader2, AlertCircle } from 'lucide-react';
import UserInfoModal from './UserInfoModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Reusable confirm dialog ───────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel, isDarkMode }) => (
  <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
    <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
      <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
      <p className="text-center font-semibold text-slate-700 dark:text-slate-200 mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── Input form modal (Add/Edit dept or batch) ─────────────────────────────────
const FormModal = ({ title, fields, initialValues = {}, onSubmit, onClose, isDarkMode, saving }) => {
  const [values, setValues] = useState(initialValues);
  const inp = `w-full px-4 py-3 rounded-xl border-2 outline-none transition-all text-sm ${
    isDarkMode
      ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white'
      : 'bg-white border-slate-200 focus:border-indigo-400'
  }`;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <div className={`px-6 pt-6 pb-4 flex items-center justify-between ${isDarkMode ? 'border-b border-slate-700' : 'border-b border-slate-100'}`}>
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(values); }} className="p-6 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
              <input
                className={inp}
                placeholder={f.placeholder}
                value={values[f.key] || ''}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                required
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── User info popup (same design as AdminPanel Load Info) ─────────────────────
const UserInfoPopup = ({ user, isDarkMode, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
    <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
      {/* Header */}
      <div className={`relative px-8 pt-8 pb-6 ${isDarkMode ? 'bg-gradient-to-br from-indigo-900/60 to-slate-800' : 'bg-gradient-to-br from-indigo-50 to-slate-50'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-lg">
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{user.name || 'No Name'}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
            <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
              user.role === 'admin'   ? 'bg-red-100 text-red-600' :
              user.role === 'cr'     ? 'bg-teal-100 text-teal-600' :
              'bg-slate-200 text-slate-600'
            }`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="px-8 py-6 space-y-4">
        <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="font-semibold">{user.email}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── UniversityExplorer ────────────────────────────────────────────────────────
const UniversityExplorer = ({ overview, fetchOverview, isDarkMode }) => {
  const [expUni, setExpUni]   = useState(null);
  const [expDept, setExpDept] = useState(null);
  const [expBatch, setExpBatch] = useState(null);

  // Modals state
  const [confirmModal, setConfirmModal] = useState(null);
  const [formModal, setFormModal]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [userPopup, setUserPopup]       = useState(null);  // full user object
  const [loadingUser, setLoadingUser]   = useState(false);

  const toggleUni   = (code) => { setExpUni(expUni === code ? null : code); setExpDept(null); setExpBatch(null); };
  const toggleDept  = (id)   => { setExpDept(expDept === id ? null : id); setExpBatch(null); };
  const toggleBatch = (id)   => { setExpBatch(expBatch === id ? null : id); };

  const getToken = () => localStorage.getItem('supabase.auth.token');

  // Fetch full user info from admin endpoint when student clicked
  const handleUserClick = async (u) => {
    setLoadingUser(true);
    setUserPopup({ email: u.email, role: u.role, name: u.name }); // show immediately with basic info
    try {
      const res = await axios.get(`${API}/api/admin/users/${u.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.ok) setUserPopup(res.data.user);
    } catch (e) {
      // keep showing basic info on error
    } finally {
      setLoadingUser(false);
    }
  };

  const doAction = async (method, url, data) => {
    setSaving(true);
    try {
      await axios({ method, url: `${API}${url}`, data, headers: { Authorization: `Bearer ${getToken()}` } });
      fetchOverview();
      setFormModal(null);
      setConfirmModal(null);
    } catch (err) {
      // Show error in a styled alert-like way inside a confirm modal
      setConfirmModal({
        message: err.response?.data?.error || 'Action failed. Please try again.',
        onConfirm: () => setConfirmModal(null),
        onCancel:  () => setConfirmModal(null),
        isError: true
      });
    } finally {
      setSaving(false);
    }
  };

  const openAddDept = (uniCode) => setFormModal({
    title: 'Add Department',
    fields: [
      { key: 'deptCode', label: 'Department Code', placeholder: 'e.g. CSE' },
      { key: 'deptName', label: 'Department Name', placeholder: 'e.g. Computer Science and Engineering' }
    ],
    initialValues: {},
    onSubmit: (v) => doAction('post', '/api/admin/departments', { uniCode, deptCode: v.deptCode, deptName: v.deptName })
  });

  const openEditDept = (d) => setFormModal({
    title: 'Edit Department',
    fields: [
      { key: 'deptCode', label: 'Department Code', placeholder: 'e.g. CSE' },
      { key: 'deptName', label: 'Department Name', placeholder: 'e.g. Computer Science' }
    ],
    initialValues: { deptCode: d.dept_code, deptName: d.dept_name },
    onSubmit: (v) => doAction('put', `/api/admin/departments/${d.dept_id}`, { deptCode: v.deptCode, deptName: v.deptName })
  });

  const openAddBatch = (deptId) => setFormModal({
    title: 'Add Batch',
    fields: [{ key: 'batchName', label: 'Batch Name', placeholder: 'e.g. CSE-2023' }],
    initialValues: {},
    onSubmit: (v) => doAction('post', '/api/admin/batches', { deptId, batchName: v.batchName })
  });

  const openEditBatch = (b) => setFormModal({
    title: 'Edit Batch',
    fields: [{ key: 'batchName', label: 'Batch Name', placeholder: 'e.g. CSE-2023' }],
    initialValues: { batchName: b.batch_name },
    onSubmit: (v) => doAction('put', `/api/admin/batches/${b.batch_id}`, { batchName: v.batchName })
  });

  const confirmDelete = (message, url) => setConfirmModal({
    message,
    onConfirm: () => doAction('delete', url, null),
    onCancel:  () => setConfirmModal(null)
  });

  const dm = isDarkMode;
  const uniRow   = (active) => `flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${active ? (dm ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-800 shadow-sm') : (dm ? 'hover:bg-slate-700/60' : 'hover:bg-white hover:shadow-sm')}`;
  const deptRow  = (active) => `flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${active ? (dm ? 'bg-teal-900/40 text-teal-300' : 'bg-teal-50 text-teal-800') : (dm ? 'hover:bg-slate-700/50' : 'hover:bg-white')}`;
  const batchBox = dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm';

  return (
    <>
      {/* Modals */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          isDarkMode={dm}
        />
      )}
      {formModal && (
        <FormModal
          title={formModal.title}
          fields={formModal.fields}
          initialValues={formModal.initialValues}
          onSubmit={formModal.onSubmit}
          onClose={() => setFormModal(null)}
          isDarkMode={dm}
          saving={saving}
        />
      )}
      {/* Shared user info modal */}
      <UserInfoModal
        user={userPopup}
        isDarkMode={dm}
        onClose={() => setUserPopup(null)}
      />

      <div className="mt-10">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🏛️</span> University Explorer
        </h3>

        <div className={`rounded-2xl border p-4 space-y-2 ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {overview?.universities?.map(uni => (
            <div key={uni.uni_code}>
              {/* ── University row ── */}
              <div className={uniRow(expUni === uni.uni_code)} onClick={() => toggleUni(uni.uni_code)}>
                <div className="flex items-center gap-2 font-bold">
                  {expUni === uni.uni_code ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <span>{uni.uni_name}</span>
                  <span className="text-xs font-mono opacity-60">({uni.uni_code})</span>
                </div>
                {expUni === uni.uni_code && (
                  <button
                    onClick={e => { e.stopPropagation(); openAddDept(uni.uni_code); }}
                    className="flex items-center gap-1 text-xs bg-indigo-500 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition-colors font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Dept
                  </button>
                )}
              </div>

              {expUni === uni.uni_code && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-indigo-200/50 dark:border-indigo-800/50 ml-4">
                  {overview.departments?.filter(d => d.uni_code === uni.uni_code).map(dept => (
                    <div key={dept.dept_id}>
                      {/* ── Dept row ── */}
                      <div className={deptRow(expDept === dept.dept_id)} onClick={() => toggleDept(dept.dept_id)}>
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          {expDept === dept.dept_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span>{dept.dept_name}</span>
                          <span className="text-xs font-mono opacity-60">({dept.dept_code})</span>
                        </div>
                        {expDept === dept.dept_id && (
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditDept(dept)} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => confirmDelete(`Delete department "${dept.dept_name}"? This cannot be undone.`, `/api/admin/departments/${dept.dept_id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openAddBatch(dept.dept_id)} className="flex items-center gap-1 text-xs bg-teal-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-600 transition-colors font-semibold">
                              <Plus className="w-3 h-3" /> Add Batch
                            </button>
                          </div>
                        )}
                      </div>

                      {expDept === dept.dept_id && (
                        <div className="pl-6 mt-1 space-y-2 border-l-2 border-teal-200/50 dark:border-teal-800/50 ml-4 pb-2">
                          {overview.batches?.filter(b => b.dept_id === dept.dept_id).map(batch => {
                            const crName = batch.crName;
                            return (
                              <div key={batch.batch_id} className={`rounded-xl border ${batchBox}`}>
                                {/* Batch header */}
                                <div
                                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                                  onClick={() => toggleBatch(batch.batch_id)}
                                >
                                  <div className="flex items-center gap-2 font-bold text-sm text-amber-600 dark:text-amber-400">
                                    {expBatch === batch.batch_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    {batch.batch_name}
                                  </div>
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {/* CR badge */}
                                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold ${
                                      crName
                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                                    }`}>
                                      <Crown className="w-3 h-3" />
                                      {crName || 'No CR'}
                                    </span>
                                    <button onClick={() => openEditBatch(batch)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors">
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => confirmDelete(`Delete batch "${batch.batch_name}"? This cannot be undone.`, `/api/admin/batches/${batch.batch_id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Batch content */}
                                {expBatch === batch.batch_id && (
                                  <div className={`px-4 pb-4 pt-2 border-t grid grid-cols-1 md:grid-cols-3 gap-4 ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
                                    {/* Students */}
                                    <div>
                                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Students
                                      </h4>
                                      <div className="space-y-1">
                                        {overview.users?.filter(u => u.batchId === batch.batch_id).length === 0 ? (
                                          <p className="text-xs text-slate-400 italic">No students yet</p>
                                        ) : overview.users?.filter(u => u.batchId === batch.batch_id).map(u => (
                                          <button
                                            key={u.id}
                                            onClick={() => handleUserClick(u)}
                                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                              dm
                                                ? 'hover:bg-slate-700 text-slate-300'
                                                : 'hover:bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                              u.role === 'cr'
                                                ? 'bg-amber-100 text-amber-700'
                                                : dm ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                              {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium truncate">{u.name || u.email}</span>
                                            {u.role === 'cr' && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Courses */}
                                    <div>
                                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" /> Courses
                                      </h4>
                                      <div className="space-y-1">
                                        {overview.courses?.filter(c => c.batch_id === batch.batch_id).length === 0 ? (
                                          <p className="text-xs text-slate-400 italic">No courses yet</p>
                                        ) : overview.courses?.filter(c => c.batch_id === batch.batch_id).map(c => (
                                          <p key={c.course_id} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                                            <span className="mt-0.5 text-teal-500">•</span>
                                            <span><span className="font-mono font-bold text-teal-600 dark:text-teal-400">{c.course_code}</span> — {c.course_name}</span>
                                          </p>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Notices placeholder */}
                                    <div>
                                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" /> Notices
                                      </h4>
                                      <p className="text-xs text-slate-400 italic">—</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {overview.batches?.filter(b => b.dept_id === dept.dept_id).length === 0 && (
                            <p className="text-xs text-slate-400 italic px-2 py-1">No batches yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {overview.departments?.filter(d => d.uni_code === uni.uni_code).length === 0 && (
                    <p className="text-sm text-slate-400 italic p-2">No departments yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default UniversityExplorer;
