import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api, { downloadSecureFile } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Users, BookOpen, Calendar, Bell, Plus, Trash2, Check, X, Loader2, AlertCircle, Pin, ChevronDown, Edit2 } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';


const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || localStorage.getItem('supabase.auth.token');
};

const TABS = [
  { id: 'requests', label: 'Join Requests', icon: Users },
  { id: 'courses',  label: 'Courses',       icon: BookOpen },
  { id: 'exams',    label: 'Exams',         icon: Calendar },
  { id: 'notices',  label: 'Notices',       icon: Bell },
];

const CATEGORIES = ['general', 'exam', 'event', 'holiday', 'urgent'];
const PRIORITIES  = ['low', 'medium', 'high'];

// ── Small reusable input ──────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

// ── CRPanel ───────────────────────────────────────────────────────────────────
const CRPanel = () => {
  const { isDarkMode } = useTheme();
  const inp = `w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none text-sm font-medium transition-all ${
    isDarkMode 
      ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-teal-500 focus:ring-teal-500/20' 
      : 'border-slate-300 bg-white text-slate-900 focus:border-teal-600 focus:ring-teal-500/20 shadow-2xs'
  }`;
  const [tab, setTab]           = useState('requests');
  const [requests, setRequests] = useState([]);
  const [courses,  setCourses]  = useState([]);
  const [courseFiles, setCourseFiles] = useState([]);
  const [exams,    setExams]    = useState([]);
  const [notices,  setNotices]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [reviewing, setReviewing] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', action: null, type: 'danger' });

  // ── Add forms state ──────────────────────────────────────────────────────
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showExamForm,   setShowExamForm]   = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [editingNoticeId, setEditingNoticeId] = useState(null);

  const [courseForm, setCourseForm] = useState({ courseCode: '', courseName: '', creditHours: '3.0' });
  const [materialForm, setMaterialForm] = useState({ courseId: '', fileName: '', file: null, fileType: 'other' });
  const [examForm,   setExamForm]   = useState({ courseId: '', name: '', date: '', time: '', venue: '', notes: '' });
  const [noticeForm, setNoticeForm] = useState({ title: '', description: '', category: 'general', priority: 'medium', isPinned: false });

  // ── Fetch batch data on mount ────────────────────────────────────────────
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [batchRes, reqRes] = await Promise.all([
        api.get('/api/cr/batch-data'),
        api.get('/api/cr/requests'),
      ]);
      if (batchRes.data.ok) {
        setCourses(batchRes.data.courses);
        setCourseFiles(batchRes.data.courseFiles || []);
        setExams(batchRes.data.exams);
        setNotices(batchRes.data.notices);
      }
      if (reqRes.data.ok) setRequests(reqRes.data.requests);
    } catch (e) {
      setError('Failed to load CR data. Are you logged in as CR?');
    } finally {
      setLoading(false);
    }
  };

  // ── Review request ───────────────────────────────────────────────────────
  const handleReview = async (id, status) => {
    setReviewing(r => ({ ...r, [id]: status }));
    try {
      await api.post('/api/cr/requests/review',
        { requestId: id, status }
      );
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch { setError('Failed to review request.'); }
    finally { setReviewing(r => ({ ...r, [id]: null })); }
  };

  const confirmAction = (title, message, action, type = 'danger') => {
    setConfirmDialog({ isOpen: true, title, message, action, type });
  };

  const handleConfirm = () => {
    if (confirmDialog.action) confirmDialog.action();
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  // ── Save Course ───────────────────────────────────────────────────────────
  const handleSaveCourse = (e) => {
    e.preventDefault();
    if (editingCourseId) {
      confirmAction('Save Changes', 'Are you sure you want to update this course?', executeSaveCourse, 'warning');
    } else {
      executeSaveCourse();
    }
  };

  const executeSaveCourse = async () => {
    setSaving(true); setError('');
    try {
      if (editingCourseId) {
        const res = await api.put(`/api/cr/courses/${editingCourseId}`, courseForm);
        if (res.data.ok) {
          setCourses(prev => prev.map(c => c.course_id === editingCourseId ? { ...c, course_code: courseForm.courseCode, course_name: courseForm.courseName, credit_hours: parseFloat(courseForm.creditHours) } : c));
          setCourseForm({ courseCode: '', courseName: '', creditHours: '3.0' });
          setShowCourseForm(false);
          setEditingCourseId(null);
        }
      } else {
        const res = await api.post('/api/cr/courses', courseForm);
        if (res.data.ok) {
          setCourses(prev => [...prev, { course_id: res.data.courseId, course_code: courseForm.courseCode, course_name: courseForm.courseName, credit_hours: parseFloat(courseForm.creditHours) }]);
          setCourseForm({ courseCode: '', courseName: '', creditHours: '3.0' });
          setShowCourseForm(false);
        }
      }
    } catch (e) { setError(e.response?.data?.error || 'Failed to save course.'); }
    finally { setSaving(false); }
  };

  const handleDeleteCourse = (id) => {
    confirmAction('Delete Course', 'Are you sure you want to delete this course? This action cannot be undone.', async () => {
      try {
        await api.delete(`/api/cr/courses/${id}`);
        setCourses(prev => prev.filter(c => c.course_id !== id));
      } catch { setError('Failed to delete course.'); }
    });
  };

  // ── Save Material ─────────────────────────────────────────────────────────
  const handleSaveMaterial = async (e) => {
    e.preventDefault(); 
    if (!materialForm.file) {
      setError('Please select a file.');
      return;
    }
    setSaving(true); setError('');
    try {
      const formData = new FormData();
      formData.append('fileName', materialForm.fileName);
      formData.append('fileType', materialForm.fileType);
      formData.append('file', materialForm.file);

      const res = await api.post(`/api/cr/courses/${materialForm.courseId}/materials`, formData);
      if (res.data.ok) {
        setCourseFiles(prev => [...prev, res.data.material]);
        setMaterialForm({ courseId: '', fileName: '', file: null, fileType: 'other' });
        // Reset file input element if needed, though closing modal handles it mostly
        setShowMaterialForm(false);
      }
    } catch (e) { setError(e.response?.data?.error || 'Failed to save material.'); }
    finally { setSaving(false); }
  };

  const handleDeleteMaterial = (id) => {
    confirmAction('Delete Material', 'Are you sure you want to delete this material?', async () => {
      try {
        await api.delete(`/api/cr/materials/${id}`);
        setCourseFiles(prev => prev.filter(f => f.id !== id));
      } catch { setError('Failed to delete material.'); }
    });
  };

  // ── Save Exam ─────────────────────────────────────────────────────────────
  const handleSaveExam = (e) => {
    e.preventDefault();
    if (editingExamId) {
      confirmAction('Save Changes', 'Are you sure you want to update this exam?', executeSaveExam, 'warning');
    } else {
      executeSaveExam();
    }
  };

  const executeSaveExam = async () => {
    setSaving(true); setError('');
    try {
      const payload = { ...examForm, courseId: parseInt(examForm.courseId) };
      if (editingExamId) {
        const res = await api.put(`/api/cr/exams/${editingExamId}`, payload);
        if (res.data.ok) {
          const course = courses.find(c => c.course_id === parseInt(examForm.courseId));
          setExams(prev => prev.map(ex => ex.id === editingExamId ? { ...ex, name: examForm.name, date: examForm.date, time: examForm.time, venue: examForm.venue, notes: examForm.notes, courseId: parseInt(examForm.courseId), courseCode: course?.course_code } : ex));
          setExamForm({ courseId: '', name: '', date: '', time: '', venue: '', notes: '' });
          setShowExamForm(false);
          setEditingExamId(null);
        }
      } else {
        const res = await api.post('/api/cr/exams', payload);
        if (res.data.ok) {
          const course = courses.find(c => c.course_id === parseInt(examForm.courseId));
          setExams(prev => [...prev, { id: res.data.examId, name: examForm.name, date: examForm.date, time: examForm.time, venue: examForm.venue, notes: examForm.notes, courseId: parseInt(examForm.courseId), courseCode: course?.course_code }]);
          setExamForm({ courseId: '', name: '', date: '', time: '', venue: '', notes: '' });
          setShowExamForm(false);
        }
      }
    } catch (e) { setError(e.response?.data?.error || 'Failed to save exam.'); }
    finally { setSaving(false); }
  };

  const handleDeleteExam = (id) => {
    confirmAction('Delete Exam', 'Are you sure you want to delete this scheduled exam?', async () => {
      try {
        await api.delete(`/api/cr/exams/${id}`);
        setExams(prev => prev.filter(ex => ex.id !== id));
      } catch { setError('Failed to delete exam.'); }
    });
  };

  // ── Save Notice ───────────────────────────────────────────────────────────
  const handleSaveNotice = (e) => {
    e.preventDefault();
    if (editingNoticeId) {
      confirmAction('Save Changes', 'Are you sure you want to update this notice?', executeSaveNotice, 'warning');
    } else {
      executeSaveNotice();
    }
  };

  const executeSaveNotice = async () => {
    setSaving(true); setError('');
    try {
      if (editingNoticeId) {
        const res = await api.put(`/api/cr/notices/${editingNoticeId}`, noticeForm);
        if (res.data.ok) {
          setNotices(prev => prev.map(n => n.id === editingNoticeId ? { ...n, title: noticeForm.title, description: noticeForm.description, category: noticeForm.category, priority: noticeForm.priority, is_pinned: noticeForm.isPinned } : n));
          setNoticeForm({ title: '', description: '', category: 'general', priority: 'medium', isPinned: false });
          setShowNoticeForm(false);
          setEditingNoticeId(null);
        }
      } else {
        const res = await api.post('/api/cr/notices', noticeForm);
        if (res.data.ok) {
          setNotices(prev => [{ id: Date.now(), ...noticeForm, postedAt: new Date().toISOString() }, ...prev]);
          setNoticeForm({ title: '', description: '', category: 'general', priority: 'medium', isPinned: false });
          setShowNoticeForm(false);
        }
      }
    } catch (e) { setError(e.response?.data?.error || 'Failed to save notice.'); }
    finally { setSaving(false); }
  };

  // ── Delete Notice ─────────────────────────────────────────────────────────
  const handleDeleteNotice = (id) => {
    confirmAction('Delete Notice', 'Are you sure you want to delete this notice?', async () => {
      try {
        await api.delete(`/api/cr/notices/${id}`);
        setNotices(prev => prev.filter(n => n.id !== id));
      } catch { setError('Failed to delete notice.'); }
    });
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const card  = `card-modern ${isDarkMode ? 'card-dark' : 'card-light'} p-8`;
  const row   = isDarkMode ? 'list-row-dark' : 'list-row-light';
  const ghost = isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200';

  if (loading) return (
    <div className={`${card} flex items-center justify-center h-48`}>
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );

  return (
    <>
      <ConfirmModal 
        isOpen={confirmDialog.isOpen} 
        title={confirmDialog.title} 
        message={confirmDialog.message} 
        onConfirm={handleConfirm} 
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} 
        type={confirmDialog.type} 
      />
      <div className={card}>
      {/* Header */}
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-teal-600">
        <span className="text-3xl">👑</span> Class Representative Panel
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              tab === id ? 'bg-gradient-to-r from-teal-600 to-teal-400 text-white shadow-md' : ghost
            }`}>
            <Icon className="w-4 h-4" />{label}
            {id === 'requests' && requests.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Join Requests ─────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-500" /> Pending Join Requests
            {requests.length > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold">{requests.length}</span>}
          </h3>
          {requests.length === 0 ? (
            <div className={`p-10 rounded-2xl text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className="text-slate-500">No pending requests. ✅</p>
            </div>
          ) : requests.map(req => (
            <div key={req.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${row}`}>
              <div>
                <p className="font-bold text-lg">{req.name || 'Unknown'}</p>
                <p className="text-slate-500 text-sm">{req.email} · Reg: <span className="font-mono font-bold">{req.regNo}</span></p>
                {req.message && <p className="text-sm italic text-slate-400 mt-1">"{req.message}"</p>}
                <p className="text-xs text-slate-400 mt-1">{new Date(req.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleReview(req.id, 'approved')}
                  disabled={!!reviewing[req.id]}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 disabled:opacity-60 transition-colors"
                >
                  {reviewing[req.id] === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => handleReview(req.id, 'rejected')}
                  disabled={!!reviewing[req.id]}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 disabled:opacity-60 transition-colors"
                >
                  {reviewing[req.id] === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Courses ──────────────────────────────────────────────────── */}
      {tab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-teal-500" /> Batch Courses</h3>
            <div className="flex gap-2">
              <button onClick={() => { setMaterialForm({ courseId: '', fileName: '', file: null, fileType: 'other' }); setShowMaterialForm(v => !v); setShowCourseForm(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <Plus className="w-4 h-4" /> Upload Material
              </button>
              <button onClick={() => { setCourseForm({ courseCode: '', courseName: '', creditHours: '3.0' }); setEditingCourseId(null); setShowCourseForm(v => !v); setShowMaterialForm(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <Plus className="w-4 h-4" /> Add Course
              </button>
            </div>
          </div>

          {showCourseForm && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up">
            <form onSubmit={handleSaveCourse} className={`w-full max-w-2xl p-6 rounded-3xl shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{editingCourseId ? 'Edit Course' : 'Add Course'}</h3>
                <button type="button" onClick={() => setShowCourseForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Course Code">
                  <input className={inp} placeholder="e.g. CSE301" value={courseForm.courseCode}
                    onChange={e => setCourseForm(f => ({ ...f, courseCode: e.target.value }))} required />
                </Field>
                <Field label="Course Name">
                  <input className={`${inp} sm:col-span-1`} placeholder="e.g. Algorithms" value={courseForm.courseName}
                    onChange={e => setCourseForm(f => ({ ...f, courseName: e.target.value }))} required />
                </Field>
                <Field label="Credit Hours">
                  <input className={inp} type="number" min="1" max="6" step="0.5" value={courseForm.creditHours}
                    onChange={e => setCourseForm(f => ({ ...f, creditHours: e.target.value }))} required />
                </Field>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCourseForm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Course'}
                </button>
              </div>
            </form>
            </div>
          )}

          {showMaterialForm && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up">
            <form onSubmit={handleSaveMaterial} className={`w-full max-w-2xl p-6 rounded-3xl shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Upload Material</h3>
                <button type="button" onClick={() => setShowMaterialForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Course">
                  <select className={inp} value={materialForm.courseId}
                    onChange={e => setMaterialForm(f => ({ ...f, courseId: e.target.value }))} required>
                    <option value="">— Select Course —</option>
                    {[...courses].sort((a, b) => a.course_code.localeCompare(b.course_code)).map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
                  </select>
                </Field>
                <Field label="File Name">
                  <input className={inp} placeholder="e.g. Chapter 1 Slides" value={materialForm.fileName}
                    onChange={e => setMaterialForm(f => ({ ...f, fileName: e.target.value }))} required />
                </Field>
                <Field label="File">
                  <input className={inp} type="file" 
                    onChange={e => setMaterialForm(f => ({ ...f, file: e.target.files[0] }))} required />
                </Field>
                <Field label="File Type">
                  <select className={inp} value={materialForm.fileType}
                    onChange={e => setMaterialForm(f => ({ ...f, fileType: e.target.value }))}>
                    <option value="lecture">Lecture</option>
                    <option value="assignment">Assignment</option>
                    <option value="past_paper">Past Paper</option>
                    <option value="resource">Resource</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowMaterialForm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Material'}
                </button>
              </div>
            </form>
            </div>
          )}

          {courses.length === 0 ? (
            <div className={`p-10 rounded-2xl text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className="text-slate-500">No courses yet. Add your first course!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...courses].sort((a, b) => a.course_code.localeCompare(b.course_code)).map(c => (
                <div key={c.course_id} className={`p-5 rounded-2xl border flex flex-col gap-3 ${row}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-teal-600">{c.course_code}</p>
                      <p className="font-semibold mt-1">{c.course_name}</p>
                      <p className="text-xs text-slate-400 mt-1">{c.credit_hours} credit hours</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setCourseForm({ courseCode: c.course_code, courseName: c.course_name, creditHours: c.credit_hours.toString() }); setEditingCourseId(c.course_id); setShowCourseForm(true); setShowMaterialForm(false); }} className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCourse(c.course_id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Show files for this course */}
                  {courseFiles.filter(f => f.courseId === c.course_id).length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase">Materials:</p>
                      {courseFiles.filter(f => f.courseId === c.course_id).map(f => (
                        <div key={f.id} className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-lg p-2 text-sm border dark:border-slate-700">
                          <button onClick={() => downloadSecureFile(f.url, f.name)} className="truncate flex-1 hover:text-teal-500 font-medium transition-colors text-left">
                            {f.name}
                          </button>
                          <button onClick={() => handleDeleteMaterial(f.id)} className="text-slate-400 hover:text-red-600 p-1 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Exams ────────────────────────────────────────────────────── */}
      {tab === 'exams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-500" /> Batch Exams</h3>
            <button onClick={() => { setExamForm({ courseId: '', name: '', date: '', time: '', venue: '', notes: '' }); setEditingExamId(null); setShowExamForm(v => !v); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Schedule Exam
            </button>
          </div>

          {showExamForm && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up">
            <form onSubmit={handleSaveExam} className={`w-full max-w-2xl p-6 rounded-3xl shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{editingExamId ? 'Edit Exam' : 'Schedule Exam'}</h3>
                <button type="button" onClick={() => setShowExamForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Course">
                  <select className={inp} value={examForm.courseId}
                    onChange={e => setExamForm(f => ({ ...f, courseId: e.target.value }))} required>
                    <option value="">— Select Course —</option>
                    {[...courses].sort((a, b) => a.course_code.localeCompare(b.course_code)).map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
                  </select>
                </Field>
                <Field label="Exam Name">
                  <input className={inp} placeholder="e.g. Midterm Exam" value={examForm.name}
                    onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} required />
                </Field>
                <Field label="Date">
                  <input type="date" className={inp} value={examForm.date}
                    onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))} required />
                </Field>
                <Field label="Time (optional)">
                  <input type="time" className={inp} value={examForm.time}
                    onChange={e => setExamForm(f => ({ ...f, time: e.target.value }))} />
                </Field>
                <Field label="Venue (optional)">
                  <input className={inp} placeholder="e.g. Room 301" value={examForm.venue}
                    onChange={e => setExamForm(f => ({ ...f, venue: e.target.value }))} />
                </Field>
                <Field label="Notes (optional)">
                  <input className={inp} placeholder="e.g. Chapters 1-5" value={examForm.notes}
                    onChange={e => setExamForm(f => ({ ...f, notes: e.target.value }))} />
                </Field>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowExamForm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
                </button>
              </div>
            </form>
            </div>
          )}

          {exams.length === 0 ? (
            <div className={`p-10 rounded-2xl text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className="text-slate-500">No exams scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(ex => (
                <div key={ex.id} className={`p-5 rounded-2xl border flex justify-between items-start ${row}`}>
                  <div>
                    <p className="font-bold text-lg">{ex.name}</p>
                    <p className="text-teal-600 font-semibold text-sm">{ex.courseCode}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(ex.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {ex.time && ` · ${ex.time.slice(0, 5)}`}
                    </p>
                    {ex.venue && <p className="text-xs text-slate-400 mt-0.5">📍 {ex.venue}</p>}
                    {ex.notes && <p className="text-xs text-slate-400 italic mt-0.5">{ex.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setExamForm({ courseId: ex.courseId.toString(), name: ex.name, date: ex.date, time: ex.time || '', venue: ex.venue || '', notes: ex.notes || '' }); setEditingExamId(ex.id); setShowExamForm(true); }} className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteExam(ex.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Notices ──────────────────────────────────────────────────── */}
      {tab === 'notices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-teal-500" /> Batch Notices</h3>
            <button onClick={() => { setNoticeForm({ title: '', description: '', category: 'general', priority: 'medium', isPinned: false }); setEditingNoticeId(null); setShowNoticeForm(v => !v); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Post Notice
            </button>
          </div>

          {showNoticeForm && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up">
            <form onSubmit={handleSaveNotice} className={`w-full max-w-2xl p-6 rounded-3xl shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{editingNoticeId ? 'Edit Notice' : 'Post Notice'}</h3>
                <button type="button" onClick={() => setShowNoticeForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <Field label="Title">
                <input className={inp} placeholder="Notice title…" value={noticeForm.title}
                  onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))} required />
              </Field>
              <Field label="Description">
                <textarea className={`${inp} resize-none`} rows={3} placeholder="Notice details…" value={noticeForm.description}
                  onChange={e => setNoticeForm(f => ({ ...f, description: e.target.value }))} required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <select className={inp} value={noticeForm.category}
                    onChange={e => setNoticeForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select className={inp} value={noticeForm.priority}
                    onChange={e => setNoticeForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={noticeForm.isPinned}
                  onChange={e => setNoticeForm(f => ({ ...f, isPinned: e.target.checked }))}
                  className="w-4 h-4 rounded text-teal-600" />
                <span className="text-sm font-semibold text-slate-600 flex items-center gap-1"><Pin className="w-4 h-4" /> Pin this notice</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNoticeForm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Notice'}
                </button>
              </div>
            </form>
            </div>
          )}

          {notices.length === 0 ? (
            <div className={`p-10 rounded-2xl text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className="text-slate-500">No notices posted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map(n => {
                const pColor = n.priority === 'high' ? 'bg-red-100 text-red-700' : n.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
                return (
                  <div key={n.id} className={`p-5 rounded-2xl border flex justify-between items-start gap-4 ${row} ${n.isPinned ? 'border-l-4 border-l-teal-500' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {n.isPinned && <Pin className="w-4 h-4 text-teal-500 shrink-0" />}
                        <p className="font-bold truncate">{n.title}</p>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold capitalize ${pColor}`}>{n.priority}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs capitalize">{n.category}</span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{n.description}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(n.postedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setNoticeForm({ title: n.title, description: n.description, category: n.category, priority: n.priority, isPinned: n.is_pinned }); setEditingNoticeId(n.id); setShowNoticeForm(true); }} className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteNotice(n.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default CRPanel;
