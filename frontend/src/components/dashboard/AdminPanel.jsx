import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Building2, BookOpen, UserCheck, Shield, Crown, RefreshCw, 
  Search, Edit3, X, Check, Eye, Plus, Layers
} from 'lucide-react';
import UniversityExplorer from './UniversityExplorer';
import UserInfoModal from './UserInfoModal';
import AcademicBreadcrumb from '../ui/AcademicBreadcrumb';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminPanel = ({ isDarkMode }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [uniFilter, setUniFilter] = useState('all');

  const [editUser, setEditUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newBatchId, setNewBatchId] = useState('');
  const [newUniId, setNewUniId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAddUni, setShowAddUni] = useState(false);
  const [uniCode, setUniCode] = useState('');
  const [uniName, setUniName] = useState('');

  const [inspectUser, setInspectUser] = useState(null);

  const getToken = () => localStorage.getItem('supabase.auth.token');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.ok) {
        setOverview(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch admin overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRoleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editUser || !newRole) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/admin/role-update`, {
        userId: editUser.id,
        role: newRole,
        batchId: ['student', 'cr'].includes(newRole) ? newBatchId : undefined,
        universityId: newRole === 'university_moderator' ? newUniId : undefined
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setEditUser(null);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUniSubmit = async (e) => {
    e.preventDefault();
    if (!uniCode || !uniName) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/admin/universities`, {
        universityCode: uniCode,
        universityName: uniName
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setShowAddUni(false);
      setUniCode('');
      setUniName('');
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add university');
    } finally {
      setSubmitting(false);
    }
  };

  const inspectUserData = async (u) => {
    setInspectUser({ ...u });
    try {
      const res = await axios.get(`${API}/api/admin/users/${u.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.ok) setInspectUser(res.data.user);
    } catch (e) { }
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-800">
        <p className="font-bold">{error}</p>
        <button onClick={fetchOverview} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">Retry</button>
      </div>
    );
  }

  const filteredUsers = (overview?.users || []).filter(u => {
    const matchesSearch = search === '' || 
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    let matchesUni = true;
    if (uniFilter !== 'all') {
      const userBatch = overview?.batches?.find(b => b.id === u.batchId || b.batch_id === u.batchId);
      const userUniId = userBatch?.departments?.faculties?.university_id;
      matchesUni = userUniId === parseInt(uniFilter);
    }

    return matchesSearch && matchesRole && matchesUni;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-teal-600 dark:text-teal-400" /> Admin Control Center
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            System-wide user roles, university hierarchy, and access controls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddUni(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Add University
          </button>
          <button
            onClick={fetchOverview}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── 4 STATS CARDS: Universities | Faculties | Departments | Batches ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Universities</span>
          </div>
          <p className="text-3xl font-black">{overview?.counts?.universities || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-violet-600 dark:text-violet-400">
            <Layers className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Faculties</span>
          </div>
          <p className="text-3xl font-black">{overview?.counts?.faculties || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-teal-600 dark:text-teal-400">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Departments</span>
          </div>
          <p className="text-3xl font-black">{overview?.counts?.departments || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center gap-3 mb-2 text-amber-600 dark:text-amber-400">
            <UserCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Batches</span>
          </div>
          <p className="text-3xl font-black">{overview?.counts?.batches || 0}</p>
        </div>
      </div>

      {/* Users Table Controls */}
      <div className={`p-6 rounded-2xl border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" /> User Directory
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`pl-9 pr-4 py-2 rounded-xl text-sm border outline-none font-medium ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm border outline-none font-bold ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="cr">Class Rep (CR)</option>
              <option value="university_moderator">Univ Moderator</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={uniFilter}
              onChange={e => setUniFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm border outline-none font-bold ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all">All Universities</option>
              {overview?.universities?.map(u => (
                <option key={u.id} value={u.id}>{u.university_name || u.uni_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider text-slate-500 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Academic Context</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map(u => {
                const batch = overview?.batches?.find(b => b.id === u.batchId || b.batch_id === u.batchId);
                const batchName = batch?.batch_name || batch?.name;
                const uniName = batch?.departments?.faculties?.universities?.university_name;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{u.name || 'Unnamed'}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : u.role === 'university_moderator'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : u.role === 'cr'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {u.role === 'cr' && <Crown className="w-3 h-3 text-amber-500" />}
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {batchName ? (
                        <div className="text-xs">
                          <p className="font-bold text-slate-700 dark:text-slate-300">{batchName}</p>
                          {uniName && <p className="text-slate-400">{uniName}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => inspectUserData(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
                          title="Inspect User Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditUser(u);
                            setNewRole(u.role);
                            setNewBatchId(u.batchId || '');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          title="Change Role"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* University Explorer */}
      <UniversityExplorer overview={overview} fetchOverview={fetchOverview} isDarkMode={isDarkMode} />

      {/* Edit Role Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Update Role for {editUser.name || editUser.email}</h3>
              <button onClick={() => setEditUser(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRoleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm font-bold outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="student">Student</option>
                  <option value="cr">Class Representative (CR)</option>
                  <option value="university_moderator">University Moderator</option>
                  <option value="admin">Global Admin</option>
                </select>
              </div>

              {['student', 'cr'].includes(newRole) && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assign Batch</label>
                  <select
                    value={newBatchId}
                    onChange={e => setNewBatchId(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-sm font-bold outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                    required
                  >
                    <option value="">Select Batch...</option>
                    {overview?.batches?.map(b => (
                      <option key={b.id || b.batch_id} value={b.id || b.batch_id}>
                        {b.batch_name || b.name} ({b.departments?.department_code || b.departments?.dept_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newRole === 'university_moderator' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assign University</label>
                  <select
                    value={newUniId}
                    onChange={e => setNewUniId(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-sm font-bold outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                    required
                  >
                    <option value="">Select University...</option>
                    {overview?.universities?.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.university_name || u.uni_name} ({u.university_code || u.uni_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-md">
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add University Modal */}
      {showAddUni && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add New University</h3>
              <button onClick={() => setShowAddUni(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddUniSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">University Code</label>
                <input
                  type="text"
                  placeholder="e.g. SSTU"
                  value={uniCode}
                  onChange={e => setUniCode(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm font-bold outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">University Name</label>
                <input
                  type="text"
                  placeholder="e.g. State Science and Technology University"
                  value={uniName}
                  onChange={e => setUniName(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm font-bold outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddUni(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-md">
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect User Info Modal */}
      {inspectUser && (
        <UserInfoModal
          user={inspectUser}
          isDarkMode={isDarkMode}
          onClose={() => setInspectUser(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
