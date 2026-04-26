import { useState } from 'react';
import { BookOpen, FileText, Link, Plus, Trash2, Pencil, Loader2, X, AlertCircle, Check } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || localStorage.getItem('supabase.auth.token');
};

const TYPES = ['attendance', 'ct', 'quiz', 'midterm', 'final', 'assignment', 'lab', 'project', 'other'];

const scoreColor = (pct) => {
  if (pct >= 80) return 'text-teal-600';
  if (pct >= 60) return 'text-amber-500';
  return 'text-red-500';
};

// ── Add/Edit Component Modal ────────────────────────────────────────────────
const ComponentModal = ({ enrollmentId, courseId, existing, onClose, onSaved }) => {
  const isEdit = !!existing;
  const [type, setType]           = useState(existing?.type     || 'ct');
  const [name, setName]           = useState(existing?.name     || '');
  const [maxMarks, setMaxMarks]   = useState(existing?.maxMarks ?? '');
  const [obtained, setObtained]   = useState(existing?.obtained ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || maxMarks === '' || obtained === '') return;
    setSaving(true); setError('');
    try {
      const token = await getToken();
      if (isEdit) {
        const res = await axios.put(
          `${API_URL}/api/student/components/${existing.id}`,
          { enrollmentId, type, name: name.trim(), maxMarks: Number(maxMarks), obtained: Number(obtained) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onSaved(res.data.component, 'edit');
      } else {
        const res = await axios.post(
          `${API_URL}/api/student/components`,
          { enrollmentId, courseId, type, name: name.trim(), maxMarks: Number(maxMarks), obtained: Number(obtained) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onSaved(res.data.component, 'add');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Grade Component' : 'Add Grade Component'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Component Type</label>
            <select
              value={type} onChange={e => setType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none capitalize"
            >
              {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Label / Name</label>
            <input
              type="text" placeholder="e.g. CT-1, Final Exam…"
              value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              required
            />
          </div>

          {/* Max Marks + Obtained */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Max Marks</label>
              <input
                type="number" min="0" step="0.5" placeholder="e.g. 30"
                value={maxMarks} onChange={e => setMaxMarks(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Obtained</label>
              <input
                type="number" min="0" step="0.5" placeholder="e.g. 24"
                value={obtained} onChange={e => setObtained(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-2xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> {isEdit ? 'Save Changes' : 'Add Component'}</>}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── CoursesTab ──────────────────────────────────────────────────────────────
const CoursesTab = ({ isDarkMode, enrollments: initialEnrollments = [], courseFiles = [] }) => {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [activeCourse, setActiveCourse] = useState(initialEnrollments[0]?.courseId || null);
  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', component?: obj }
  const [deleting, setDeleting] = useState({});
  const [error, setError] = useState('');

  if (enrollments.length === 0) {
    return (
      <div className={`p-10 rounded-3xl text-center border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/80 shadow-md'}`}>
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Courses Yet</h3>
        <p className="text-slate-500">You are not enrolled in any courses for this batch.</p>
      </div>
    );
  }

  // ── Overall CGPA (credit-weighted) ───────────────────────────────────────
  const cgpaData = enrollments.reduce((acc, enr) => {
    const credits  = enr.creditHours || 0;
    const obtained = enr.components?.reduce((s, c) => s + (c.obtained  || 0), 0) || 0;
    const max      = enr.components?.reduce((s, c) => s + (c.maxMarks  || 0), 0) || 0;
    if (max > 0) {
      acc.weightedObtained += (obtained / max) * credits;
      acc.totalCredits     += credits;
    }
    return acc;
  }, { weightedObtained: 0, totalCredits: 0 });

  const overallPct = cgpaData.totalCredits > 0
    ? Math.round((cgpaData.weightedObtained / cgpaData.totalCredits) * 100)
    : null;

  const selectedEnrollment = enrollments.find(e => e.courseId === activeCourse) || enrollments[0];
  const filesForCourse = courseFiles.filter(f => f.courseId === activeCourse);

  // ── Compute total ────────────────────────────────────────────────────────
  const totalObtained = selectedEnrollment.components?.reduce((s, c) => s + (c.obtained || 0), 0) || 0;
  const totalMax      = selectedEnrollment.components?.reduce((s, c) => s + (c.maxMarks || 0), 0) || 0;
  const totalPct      = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

  // ── Delete component ─────────────────────────────────────────────────────
  const handleDelete = async (comp) => {
    if (!confirm(`Delete "${comp.name}"?`)) return;
    setDeleting(d => ({ ...d, [comp.id]: true }));
    setError('');
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/api/student/components/${comp.id}/enrollment/${selectedEnrollment.enrollId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrollments(prev => prev.map(e =>
        e.courseId === activeCourse
          ? { ...e, components: e.components.filter(c => c.id !== comp.id) }
          : e
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete component.');
    } finally {
      setDeleting(d => ({ ...d, [comp.id]: false }));
    }
  };

  // ── Modal saved callback ─────────────────────────────────────────────────
  const handleSaved = (savedComp, mode) => {
    setEnrollments(prev => prev.map(e => {
      if (e.courseId !== activeCourse) return e;
      if (mode === 'add') {
        return { ...e, components: [...e.components, savedComp] };
      } else {
        return { ...e, components: e.components.map(c => c.id === savedComp.id ? savedComp : c) };
      }
    }));
  };

  const card = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/80 shadow-md';
  const compCard = isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200';

  return (
    <>
      {modal && (
        <ComponentModal
          enrollmentId={selectedEnrollment.enrollId}
          courseId={selectedEnrollment.courseId}
          existing={modal.mode === 'edit' ? modal.component : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Overall CGPA Banner ─────────────────────────────────────────── */}
      {overallPct !== null && (
        <div className={`mb-6 p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/80 shadow-md'
        }`}>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Overall Grade (Credit Weighted)</p>
            <p className="text-sm text-slate-500">
              Calculated across {enrollments.filter(e => (e.components?.length || 0) > 0).length} of {enrollments.length} courses
              · {cgpaData.totalCredits} graded credits
            </p>
          </div>
          <div className="flex items-center gap-6">
            {/* Progress ring-style display */}
            <div className="flex flex-col items-center">
              <span className={`text-5xl font-black ${scoreColor(overallPct)}`}>{overallPct}%</span>
              <span className="text-xs text-slate-400 font-semibold mt-1">Overall</span>
            </div>
            <div className="w-48">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    overallPct >= 80 ? 'bg-gradient-to-r from-teal-500 to-teal-400'
                    : overallPct >= 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  style={{ width: `${Math.min(100, overallPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-400 font-semibold">Fail</span>
                <span className="text-amber-400 font-semibold">Average</span>
                <span className="text-teal-500 font-semibold">Good</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-4 ml-2">Enrolled Courses</h3>
          {enrollments.map(course => (
            <button
              key={course.courseId}
              onClick={() => setActiveCourse(course.courseId)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                activeCourse === course.courseId
                  ? 'bg-gradient-to-r from-teal-600 to-teal-400 text-white shadow-md'
                  : `text-slate-600 hover:bg-slate-100 ${isDarkMode ? 'bg-slate-900/50' : 'bg-white/50'}`
              }`}
            >
              <p className="font-bold">{course.code}</p>
              <p className={`text-xs truncate ${activeCourse === course.courseId ? 'text-teal-50' : 'text-slate-500'}`}>
                {course.title}
              </p>
            </button>
          ))}
        </div>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-8">
          {/* Grades Card */}
          <div className={`p-8 rounded-3xl border ${card}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <span className="text-3xl">📊</span> Grades & Marks
                </h2>
                <p className="text-slate-500 text-sm mt-1">{selectedEnrollment.title} · {selectedEnrollment.creditHours} Credits</p>
              </div>
              <div className="flex items-center gap-3">
                {totalPct !== null && (
                  <div className={`text-2xl font-black ${scoreColor(totalPct)}`}>
                    {totalPct}%
                    <span className="text-sm font-normal text-slate-500 ml-1">total</span>
                  </div>
                )}
                <button
                  onClick={() => setModal({ mode: 'add' })}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl text-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {selectedEnrollment.components?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {selectedEnrollment.components.map(comp => {
                  const pct = comp.maxMarks > 0 ? Math.round((comp.obtained / comp.maxMarks) * 100) : 0;
                  return (
                    <div key={comp.id} className={`p-5 rounded-2xl border relative group ${compCard}`}>
                      {/* Action buttons - appear on hover */}
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ mode: 'edit', component: comp })}
                          className="p-1.5 rounded-lg bg-white text-slate-400 hover:text-teal-600 hover:bg-teal-50 shadow-sm transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(comp)}
                          disabled={deleting[comp.id]}
                          className="p-1.5 rounded-lg bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 shadow-sm transition-colors"
                          title="Delete"
                        >
                          {deleting[comp.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{comp.type}</p>
                      <p className="font-bold text-base mb-3 pr-14 truncate" title={comp.name}>{comp.name}</p>

                      <div className="flex items-end justify-between">
                        <div>
                          <span className={`text-3xl font-black ${scoreColor(pct)}`}>{comp.obtained}</span>
                          <span className="text-slate-400 font-medium"> / {comp.maxMarks}</span>
                        </div>
                        <span className={`text-sm font-bold ${scoreColor(pct)}`}>{pct}%</span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct >= 80 ? 'bg-teal-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-10 rounded-2xl text-center border-2 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className="text-slate-500 mb-3">No grade components yet.</p>
                <button
                  onClick={() => setModal({ mode: 'add' })}
                  className="px-4 py-2 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-100 transition-colors"
                >
                  + Add your first component
                </button>
              </div>
            )}
          </div>

          {/* Course Materials */}
          <div className={`p-8 rounded-3xl border ${card}`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">📁</span> Course Materials
            </h2>
            {filesForCourse.length > 0 ? (
              <div className="space-y-3">
                {filesForCourse.map(file => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                      isDarkMode
                        ? 'bg-slate-800/50 border-slate-700 hover:border-teal-500/50'
                        : 'bg-slate-50 border-slate-200 hover:border-teal-400 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-200 rounded-xl group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors text-slate-600">
                        {file.type === 'lecture' ? <BookOpen className="w-5 h-5" /> :
                         file.type === 'assignment' ? <FileText className="w-5 h-5" /> :
                         <Link className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold group-hover:text-teal-600 transition-colors">{file.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{file.type}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={`p-10 rounded-2xl text-center border-2 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className="text-slate-500">No materials uploaded by the CR yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CoursesTab;
