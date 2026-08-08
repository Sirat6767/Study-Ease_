import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, BookOpen, Users, CheckCircle, XCircle, Plus, 
  Trash2, Edit3, Shield, RefreshCw, Crown, AlertCircle, Layers
} from 'lucide-react';
import UserInfoModal from './UserInfoModal';
import AcademicBreadcrumb from '../ui/AcademicBreadcrumb';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ModeratorPanel = ({ isDarkMode }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [showAddFaculty, setShowAddFaculty]   = useState(false);
  const [showAddDept, setShowAddDept]         = useState(false);
  const [showAddBatch, setShowAddBatch]       = useState(false);
  const [inspectUser, setInspectUser]         = useState(null);

  // Form states
  const [facultyCode, setFacultyCode] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [deptFacultyId, setDeptFacultyId] = useState('');
  const [deptCode, setDeptCode]       = useState('');
  const [deptName, setDeptName]       = useState('');
  const [batchDeptId, setBatchDeptId] = useState('');
  const [batchName, setBatchName]     = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const getToken = () => localStorage.getItem('supabase.auth.token');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API}/api/moderator/overview`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.ok) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load moderator overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    if (!facultyName) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/moderator/faculties`, {
        facultyCode, facultyName, universityId: data?.universityId
      }, { headers: { Authorization: `Bearer ${getToken()}` } });
      setShowAddFaculty(false);
      setFacultyCode('');
      setFacultyName('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add faculty');
    } finally { setSubmitting(false); }
  };

  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!deptFacultyId || !deptCode || !deptName) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/moderator/departments`, {
        facultyId: deptFacultyId, deptCode, deptName
      }, { headers: { Authorization: `Bearer ${getToken()}` } });
      setShowAddDept(false);
      setDeptFacultyId('');
      setDeptCode('');
      setDeptName('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add department');
    } finally { setSubmitting(false); }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!batchDeptId || !batchName) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/moderator/batches`, {
        deptId: batchDeptId, batchName
      }, { headers: { Authorization: `Bearer ${getToken()}` } });
      setShowAddBatch(false);
      setBatchDeptId('');
      setBatchName('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add batch');
    } finally { setSubmitting(false); }
  };

  const handleReviewRequest = async (requestId, status) => {
    try {
      await axios.post(`${API}/api/moderator/requests/review`, { requestId, status }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to review request');
    }
  };

  const handleDeleteItem = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      await axios.delete(`${API}/api/moderator/${type}s/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to delete ${type}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-800">
        <p className="font-bold">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">Retry</button>
      </div>
    );
  }

  const universityName = data?.universities?.[0]?.university_name || 'Assigned University';

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-teal-600 dark:text-teal-400" /> University Moderator Portal
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Managing <strong className="text-teal-600 dark:text-teal-400">{universityName}</strong> hierarchy, batches, and approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddFaculty(true)}
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Faculty
          </button>
          <button
            onClick={() => setShowAddDept(true)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Department
          </button>
          <button
            onClick={() => setShowAddBatch(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Batch
          </button>
          <button onClick={fetchData} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 4 STATS CARDS: Faculties | Departments | Batches | Pending Requests ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-violet-600 dark:text-violet-400">
            <Layers className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Faculties</span>
          </div>
          <p className="text-3xl font-black">{data?.faculties?.length || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-teal-600 dark:text-teal-400">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Departments</span>
          </div>
          <p className="text-3xl font-black">{data?.departments?.length || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-amber-600 dark:text-amber-400">
            <Users className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Batches</span>
          </div>
          <p className="text-3xl font-black">{data?.batches?.length || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Requests</span>
          </div>
          <p className="text-3xl font-black">{data?.pendingRequests?.length || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {['overview', 'faculties', 'departments', 'batches', 'requests'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <h3 className="text-lg font-bold flex items-center justify-between">
              <span>Pending Join Requests</span>
              <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">{data?.pendingRequests?.length || 0}</span>
            </h3>
            {data?.pendingRequests?.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {data?.pendingRequests?.map(r => (
                  <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm">{r.name || r.email}</p>
                      <p className="text-xs text-slate-400">Reg: {r.regNo || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleReviewRequest(r.id, 'approved')} className="p-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => handleReviewRequest(r.id, 'rejected')} className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600"><XCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <h3 className="text-lg font-bold">University Hierarchy Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Total Faculties</span>
                <span className="font-bold">{data?.faculties?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Total Departments</span>
                <span className="font-bold">{data?.departments?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Total Active Batches</span>
                <span className="font-bold">{data?.batches?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-medium">Enrolled Students</span>
                <span className="font-bold">{data?.students?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Adding Faculty / Dept / Batch */}
      {showAddFaculty && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">Add New Faculty</h3>
            <form onSubmit={handleAddFaculty} className="space-y-4">
              <input type="text" placeholder="Faculty Code (e.g. FSCI)" value={facultyCode} onChange={e => setFacultyCode(e.target.value)} className="w-full p-3 rounded-xl border text-sm font-bold outline-none dark:bg-slate-800 dark:border-slate-700" />
              <input type="text" placeholder="Faculty Name (e.g. Faculty of Science)" value={facultyName} onChange={e => setFacultyName(e.target.value)} className="w-full p-3 rounded-xl border text-sm font-bold outline-none dark:bg-slate-800 dark:border-slate-700" required />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddFaculty(false)} className="flex-1 py-2.5 font-bold text-slate-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-violet-600 text-white font-bold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddDept && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">Add Department</h3>
            <form onSubmit={handleAddDept} className="space-y-4">
              <select value={deptFacultyId} onChange={e => setDeptFacultyId(e.target.value)} className="w-full p-3 rounded-xl border text-sm font-bold outline-none dark:bg-slate-800 dark:border-slate-700" required>
                <option value="">Select Parent Faculty...</option>
                {data?.faculties?.map(f => (
                  <option key={f.id} value={f.id}>{f.faculty_name || f.name}</option>
                ))}
              </select>
              <input type="text" placeholder="Dept Code (e.g. CSE)" value={deptCode} onChange={e => setDeptCode(e.target.value)} className="w-full p-3 rounded-xl border text-sm font-bold outline-none dark:bg-slate-800 dark:border-slate-700" required />
              <input type="text" placeholder="Dept Name (e.g. Computer Science)" value={deptName} onChange={e => setDeptName(e.target.value)} className="w-full p-3 rounded-xl border text-sm font-bold outline-none dark:bg-slate-800 dark:border-slate-700" required />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddDept(false)} className="flex-1 py-2.5 font-bold text-slate-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-teal-600 text-white font-bold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddBatch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">Add Batch</h3>
            <form onSubmit={handleAddBatch} className="space-y-4">
              <select value={batchDeptId} onChange={e => setBatchDeptId(e.target.value)} className="w-full p-3 rounded-xl border text-sm font-bold outline-none dark:bg-slate-800 dark:border-slate-700" required>
                <option value="">Select Department...</option>
                {data?.departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.department_name || d.dept_name} ({d.department_code || d.dept_code})</option>
                ))}
              </select>
              <input type="text" placeholder="Batch Name (e.g. CSE-2023)" value={batchName} onChange={e => setBatchName(e.target.value)} className="w-full p-3 rounded-xl border text-sm font-bold outline-none dark:bg-slate-800 dark:border-slate-700" required />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddBatch(false)} className="flex-1 py-2.5 font-bold text-slate-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorPanel;
