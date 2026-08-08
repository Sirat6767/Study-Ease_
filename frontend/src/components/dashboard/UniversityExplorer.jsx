import { useState } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, BookOpen, Users, Crown, X, Save, Loader2, AlertCircle, Layers } from 'lucide-react';
import UserInfoModal from './UserInfoModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
                required={f.required !== false}
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

const UniversityExplorer = ({ overview, fetchOverview, isDarkMode }) => {
  // Tree expansion state maps (IDs)
  const [expUni, setExpUni]     = useState(null);
  const [expFac, setExpFac]     = useState(null);
  const [expDept, setExpDept]   = useState(null);
  const [expBatch, setExpBatch] = useState(null);

  const [confirmModal, setConfirmModal] = useState(null);
  const [formModal, setFormModal]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [userPopup, setUserPopup]       = useState(null);

  const toggleUni   = (id) => { setExpUni(expUni === id ? null : id); setExpFac(null); setExpDept(null); setExpBatch(null); };
  const toggleFac   = (id) => { setExpFac(expFac === id ? null : id); setExpDept(null); setExpBatch(null); };
  const toggleDept  = (id) => { setExpDept(expDept === id ? null : id); setExpBatch(null); };
  const toggleBatch = (id) => { setExpBatch(expBatch === id ? null : id); };

  const getToken = () => localStorage.getItem('supabase.auth.token');

  const handleUserClick = async (u) => {
    setUserPopup({ email: u.email, role: u.role, name: u.name });
    try {
      const res = await axios.get(`${API}/api/admin/users/${u.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.ok) setUserPopup(res.data.user);
    } catch (e) { }
  };

  const doAction = async (method, url, data) => {
    setSaving(true);
    try {
      await axios({ method, url: `${API}${url}`, data, headers: { Authorization: `Bearer ${getToken()}` } });
      fetchOverview();
      setFormModal(null);
      setConfirmModal(null);
    } catch (err) {
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

  // CRUD Openers
  const openAddFaculty = (universityId) => setFormModal({
    title: 'Add Faculty',
    fields: [
      { key: 'facultyCode', label: 'Faculty Code', placeholder: 'e.g. FSCI', required: false },
      { key: 'facultyName', label: 'Faculty Name', placeholder: 'e.g. Faculty of Science' }
    ],
    initialValues: {},
    onSubmit: (v) => doAction('post', '/api/admin/faculties', { universityId, facultyCode: v.facultyCode, facultyName: v.facultyName })
  });

  const openEditFaculty = (f) => setFormModal({
    title: 'Edit Faculty',
    fields: [
      { key: 'facultyCode', label: 'Faculty Code', placeholder: 'e.g. FSCI', required: false },
      { key: 'facultyName', label: 'Faculty Name', placeholder: 'e.g. Faculty of Science' }
    ],
    initialValues: { facultyCode: f.faculty_code || f.code, facultyName: f.faculty_name || f.name },
    onSubmit: (v) => doAction('put', `/api/admin/faculties/${f.id}`, { facultyCode: v.facultyCode, facultyName: v.facultyName })
  });

  const openAddDept = (facultyId) => setFormModal({
    title: 'Add Department',
    fields: [
      { key: 'deptCode', label: 'Department Code', placeholder: 'e.g. CSE' },
      { key: 'deptName', label: 'Department Name', placeholder: 'e.g. Computer Science and Engineering' }
    ],
    initialValues: {},
    onSubmit: (v) => doAction('post', '/api/admin/departments', { facultyId, deptCode: v.deptCode, deptName: v.deptName })
  });

  const openEditDept = (d) => setFormModal({
    title: 'Edit Department',
    fields: [
      { key: 'deptCode', label: 'Department Code', placeholder: 'e.g. CSE' },
      { key: 'deptName', label: 'Department Name', placeholder: 'e.g. Computer Science' }
    ],
    initialValues: { deptCode: d.department_code || d.dept_code, deptName: d.department_name || d.dept_name },
    onSubmit: (v) => doAction('put', `/api/admin/departments/${d.id}`, { deptCode: v.deptCode, deptName: v.deptName })
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
    initialValues: { batchName: b.batch_name || b.name },
    onSubmit: (v) => doAction('put', `/api/admin/batches/${b.id}`, { batchName: v.batchName })
  });

  const confirmDelete = (message, url) => setConfirmModal({
    message,
    onConfirm: () => doAction('delete', url, null),
    onCancel:  () => setConfirmModal(null)
  });

  const dm = isDarkMode;
  const uniRow   = (active) => `flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${active ? (dm ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-800 shadow-xs') : (dm ? 'hover:bg-slate-700/60' : 'hover:bg-white hover:shadow-xs')}`;
  const facRow   = (active) => `flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${active ? (dm ? 'bg-violet-900/40 text-violet-300' : 'bg-violet-50 text-violet-800') : (dm ? 'hover:bg-slate-700/50' : 'hover:bg-white')}`;
  const deptRow  = (active) => `flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${active ? (dm ? 'bg-teal-900/40 text-teal-300' : 'bg-teal-50 text-teal-800') : (dm ? 'hover:bg-slate-700/40' : 'hover:bg-white')}`;
  const batchBox = dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-xs';

  return (
    <>
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
      <UserInfoModal
        user={userPopup}
        isDarkMode={dm}
        onClose={() => setUserPopup(null)}
      />

      <div className="mt-10">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🏛️</span> University Explorer
        </h3>

        {/* ── 4-TIER COLLAPSIBLE TREE UI ── */}
        <div className={`rounded-2xl border p-4 space-y-2 ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {overview?.universities?.map(uni => {
            const uniFaculties = (overview.faculties || []).filter(f => f.university_id === uni.id);
            return (
              <div key={uni.id}>
                {/* 1. UNIVERSITY NODE */}
                <div className={uniRow(expUni === uni.id)} onClick={() => toggleUni(uni.id)}>
                  <div className="flex items-center gap-2 font-bold">
                    {expUni === uni.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <span>{uni.university_name || uni.uni_name}</span>
                    <span className="text-xs font-mono opacity-60">({uni.university_code || uni.uni_code})</span>
                  </div>
                  {expUni === uni.id && (
                    <button
                      onClick={e => { e.stopPropagation(); openAddFaculty(uni.id); }}
                      className="flex items-center gap-1 text-xs bg-indigo-500 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition-colors font-semibold"
                    >
                      <Plus className="w-3 h-3" /> Add Faculty
                    </button>
                  )}
                </div>

                {expUni === uni.id && (
                  <div className="pl-6 mt-1 space-y-1 border-l-2 border-indigo-200/50 dark:border-indigo-800/50 ml-4">
                    {uniFaculties.map(fac => {
                      const facDepts = (overview.departments || []).filter(d => d.faculty_id === fac.id);
                      return (
                        <div key={fac.id}>
                          {/* 2. FACULTY NODE */}
                          <div className={facRow(expFac === fac.id)} onClick={() => toggleFac(fac.id)}>
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              {expFac === fac.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <Layers className="w-3.5 h-3.5 text-violet-500" />
                              <span>{fac.faculty_name || fac.name}</span>
                              {(fac.faculty_code || fac.code) && <span className="text-xs font-mono opacity-60">({fac.faculty_code || fac.code})</span>}
                            </div>
                            {expFac === fac.id && (
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <button onClick={() => openEditFaculty(fac)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => confirmDelete(`Delete faculty "${fac.faculty_name || fac.name}"? This cannot be undone.`, `/api/admin/faculties/${fac.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openAddDept(fac.id)} className="flex items-center gap-1 text-xs bg-violet-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-violet-700 transition-colors font-semibold">
                                  <Plus className="w-3 h-3" /> Add Dept
                                </button>
                              </div>
                            )}
                          </div>

                          {expFac === fac.id && (
                            <div className="pl-6 mt-1 space-y-1 border-l-2 border-violet-200/50 dark:border-violet-800/50 ml-4">
                              {facDepts.map(dept => {
                                const deptBatches = (overview.batches || []).filter(b => b.department_id === dept.id || b.dept_id === dept.id);
                                return (
                                  <div key={dept.id}>
                                    {/* 3. DEPARTMENT NODE */}
                                    <div className={deptRow(expDept === dept.id)} onClick={() => toggleDept(dept.id)}>
                                      <div className="flex items-center gap-2 font-semibold text-sm">
                                        {expDept === dept.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <span>{dept.department_name || dept.dept_name}</span>
                                        <span className="text-xs font-mono opacity-60">({dept.department_code || dept.dept_code})</span>
                                      </div>
                                      {expDept === dept.id && (
                                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                          <button onClick={() => openEditDept(dept)} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors">
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          <button onClick={() => confirmDelete(`Delete department "${dept.department_name || dept.dept_name}"? This cannot be undone.`, `/api/admin/departments/${dept.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button onClick={() => openAddBatch(dept.id)} className="flex items-center gap-1 text-xs bg-teal-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-600 transition-colors font-semibold">
                                            <Plus className="w-3 h-3" /> Add Batch
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {expDept === dept.id && (
                                      <div className="pl-6 mt-1 space-y-2 border-l-2 border-teal-200/50 dark:border-teal-800/50 ml-4 pb-2">
                                        {deptBatches.map(batch => {
                                          const crName = batch.crName;
                                          const bId = batch.id || batch.batch_id;
                                          return (
                                            /* 4. BATCH NODE */
                                            <div key={bId} className={`rounded-xl border ${batchBox}`}>
                                              <div
                                                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                                                onClick={() => toggleBatch(bId)}
                                              >
                                                <div className="flex items-center gap-2 font-bold text-sm text-amber-600 dark:text-amber-400">
                                                  {expBatch === bId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                  {batch.batch_name || batch.name}
                                                </div>
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
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
                                                  <button onClick={() => confirmDelete(`Delete batch "${batch.batch_name || batch.name}"? This cannot be undone.`, `/api/admin/batches/${bId}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>

                                              {expBatch === bId && (
                                                <div className={`px-4 pb-4 pt-2 border-t grid grid-cols-1 md:grid-cols-3 gap-4 ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
                                                  <div>
                                                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                                                      <Users className="w-3 h-3" /> Students
                                                    </h4>
                                                    <div className="space-y-1">
                                                      {overview.users?.filter(u => u.batchId === bId).length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic">No students yet</p>
                                                      ) : overview.users?.filter(u => u.batchId === bId).map(u => (
                                                        <button
                                                          key={u.id}
                                                          onClick={() => handleUserClick(u)}
                                                          className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                                            dm ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                                                          }`}
                                                        >
                                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                            u.role === 'cr' ? 'bg-amber-100 text-amber-700' : dm ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                                                          }`}>
                                                            {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                                          </div>
                                                          <span className="font-medium truncate">{u.name || u.email}</span>
                                                          {u.role === 'cr' && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </div>

                                                  <div>
                                                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                                                      <BookOpen className="w-3 h-3" /> Courses
                                                    </h4>
                                                    <div className="space-y-1">
                                                      {overview.courses?.filter(c => c.batch_id === bId).length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic">No courses yet</p>
                                                      ) : overview.courses?.filter(c => c.batch_id === bId).map(c => (
                                                        <p key={c.course_id} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                                                          <span className="mt-0.5 text-teal-500">•</span>
                                                          <span><span className="font-mono font-bold text-teal-600 dark:text-teal-400">{c.course_code}</span> — {c.course_name}</span>
                                                        </p>
                                                      ))}
                                                    </div>
                                                  </div>

                                                  <div>
                                                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                                                      <BookOpen className="w-3 h-3" /> Notices
                                                    </h4>
                                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                                      {overview.notices?.filter(n => n.batch_id === bId).length || 0} notices
                                                    </p>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {deptBatches.length === 0 && (
                                          <p className="text-xs text-slate-400 italic px-2 py-1">No batches yet</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {facDepts.length === 0 && (
                                <p className="text-xs text-slate-400 italic px-2 py-1">No departments yet</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {uniFaculties.length === 0 && (
                      <p className="text-sm text-slate-400 italic p-2">No faculties yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default UniversityExplorer;
