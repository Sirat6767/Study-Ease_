import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Building, Activity, Plus, Save, X } from 'lucide-react';
import UniversityExplorer from './UniversityExplorer';
import UserInfoModal from './UserInfoModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminPanel = ({ isDarkMode }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUniModal, setShowUniModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleForm, setRoleForm] = useState({ role: 'student', batchId: '', uniCode: '' });
  const [uniForm, setUniForm] = useState({ isEdit: false, oldCode: '', uniCode: '', uniName: '' });
  
  const [userInfoModal, setUserInfoModal] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const res = await axios.get(`${API}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.ok) setOverview(res.data);
    } catch (err) {
      console.error('Failed to fetch admin overview');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUniversity = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to ${uniForm.isEdit ? 'edit' : 'add'} this university?`)) return;
    try {
      const token = localStorage.getItem('supabase.auth.token');
      if (uniForm.isEdit) {
        await axios.put(`${API}/api/admin/universities/${uniForm.oldCode}`, uniForm, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/api/admin/universities`, uniForm, { headers: { Authorization: `Bearer ${token}` } });
      }
      setUniForm({ isEdit: false, oldCode: '', uniCode: '', uniName: '' });
      setShowUniModal(false);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${uniForm.isEdit ? 'edit' : 'add'} university`);
    }
  };

  const handleDeleteUni = async (uniCode) => {
    if (!window.confirm('CAUTION: Are you sure you want to delete this university? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('supabase.auth.token');
      await axios.delete(`${API}/api/admin/universities/${uniCode}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete university');
    }
  };

  const openEditUni = (uni) => {
    setUniForm({ isEdit: true, oldCode: uni.uni_code, uniCode: uni.uni_code, uniName: uni.uni_name });
    setShowUniModal(true);
  };
  
  const openAddUni = () => {
    setUniForm({ isEdit: false, oldCode: '', uniCode: '', uniName: '' });
    setShowUniModal(true);
  };

  const handleLoadInfo = async (u) => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const res = await axios.get(`${API}/api/admin/users/${u.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUserInfoModal(res.data.user);
    } catch (err) {
      alert('Failed to load user info');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const payload = { userId: selectedUser.id, role: roleForm.role };
      if (roleForm.role === 'cr' || roleForm.role === 'student') {
        payload.batchId = parseInt(roleForm.batchId);
      } else if (roleForm.role === 'university_moderator') {
        payload.uniCode = roleForm.uniCode;
      }
      
      await axios.post(`${API}/api/admin/role-update`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setShowRoleModal(false);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const openRoleModal = (u) => {
    setSelectedUser(u);
    setRoleForm({ role: u.role, batchId: '', uniCode: '' });
    setShowRoleModal(true);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Admin Data...</div>;
  if (!overview) return <div className="p-8 text-center text-red-500">Failed to load admin panel.</div>;

  const inp = `w-full px-4 py-3 rounded-xl border outline-none transition-all ${
    isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'
  }`;

  return (
    <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/80 shadow-md'}`}>
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
        <Shield className="w-8 h-8" /> System Administration
      </h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-100'}`}>
          <Users className="w-6 h-6 text-indigo-500 mb-2" />
          <p className="text-3xl font-black text-slate-800 dark:text-white">{overview.counts?.users}</p>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Users</p>
        </div>
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-teal-50 border-teal-100'}`}>
          <Building className="w-6 h-6 text-teal-500 mb-2" />
          <p className="text-3xl font-black text-slate-800 dark:text-white">{overview.counts?.universities}</p>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Universities</p>
        </div>
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-violet-50 border-violet-100'}`}>
          <Activity className="w-6 h-6 text-violet-500 mb-2" />
          <p className="text-3xl font-black text-slate-800 dark:text-white">{overview.counts?.departments}</p>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Departments</p>
        </div>
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-100'}`}>
          <Shield className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-3xl font-black text-slate-800 dark:text-white">{overview.counts?.batches}</p>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Batches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Users List & Role Management */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Manage Roles & Permissions</h3>
          </div>
          <div className="mb-4">
            <input type="text" placeholder="Search users by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-full px-4 py-2 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {overview.users?.filter(u => (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
              <div key={u.id} className={`p-4 rounded-xl flex justify-between items-center border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <p className="font-bold">{u.name || u.email}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                    u.role === 'admin' ? 'bg-red-100 text-red-600' : 
                    u.role === 'cr' ? 'bg-teal-100 text-teal-600' : 
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                  <button onClick={() => handleLoadInfo(u)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm font-bold">
                    Load Info
                  </button>
                  <button onClick={() => openRoleModal(u)} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-bold">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Universities Management */}
        <div>
           <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-300 bg-slate-50/50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Manage Universities</h3>
              <button onClick={openAddUni} className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600 transition-colors">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {overview.universities?.map(uni => (
                <div key={uni.uni_code} className={`p-4 rounded-xl flex justify-between items-center border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div>
                    <p className="font-bold">{uni.uni_name}</p>
                    <p className="text-sm text-slate-500 font-mono">{uni.uni_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditUni(uni)} className="text-sm font-bold text-indigo-500 hover:text-indigo-700">Edit</button>
                    <button onClick={() => handleDeleteUni(uni.uni_code)} className="text-sm font-bold text-red-500 hover:text-red-700">Remove</button>
                  </div>
                </div>
              ))}
            </div>
           </div>
        </div>
      </div>

      {/* Modals */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Update Role</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <p className="mb-4 text-sm text-slate-500">Updating role for <strong className="text-slate-800 dark:text-white">{selectedUser.email}</strong></p>
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Role</label>
                <select className={inp} value={roleForm.role} onChange={e => setRoleForm({ ...roleForm, role: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="cr">Class Representative (CR)</option>
                  <option value="university_moderator">University Moderator</option>
                </select>
              </div>
              {(roleForm.role === 'cr' || roleForm.role === 'student') && (
                <div>
                  <label className="block text-sm font-bold mb-2">Assign to Batch</label>
                  <select className={inp} value={roleForm.batchId} onChange={e => setRoleForm({ ...roleForm, batchId: e.target.value })} required>
                    <option value="">-- Select Batch --</option>
                    {overview.batches?.map(b => (
                      <option key={b.batch_id} value={b.batch_id}>{b.uni_code} - {b.dept_code} - {b.batch_name}</option>
                    ))}
                  </select>
                </div>
              )}
              {roleForm.role === 'university_moderator' && (
                <div>
                  <label className="block text-sm font-bold mb-2">Assign to University</label>
                  <select className={inp} value={roleForm.uniCode} onChange={e => setRoleForm({ ...roleForm, uniCode: e.target.value })} required>
                    <option value="">-- Select University --</option>
                    {overview.universities?.map(u => (
                      <option key={u.uni_code} value={u.uni_code}>{u.uni_name} ({u.uni_code})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowRoleModal(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4"/> Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUniModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{uniForm.isEdit ? 'Edit University' : 'Add University'}</h3>
              <button onClick={() => setShowUniModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddUniversity} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">University Code</label>
                <input className={inp} placeholder="e.g. MIT" value={uniForm.uniCode} onChange={e => setUniForm({ ...uniForm, uniCode: e.target.value.toUpperCase() })} required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">University Name</label>
                <input className={inp} placeholder="e.g. Mass Institute" value={uniForm.uniName} onChange={e => setUniForm({ ...uniForm, uniName: e.target.value })} required />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowUniModal(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4"/> {uniForm.isEdit ? 'Save Changes' : 'Add University'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Info Modal — shared component */}
      <UserInfoModal
        user={userInfoModal}
        isDarkMode={isDarkMode}
        onClose={() => setUserInfoModal(null)}
      />
      
      {/* University Explorer Section */}
      <UniversityExplorer overview={overview} fetchOverview={fetchOverview} isDarkMode={isDarkMode} />
    </div>
  );
};

export default AdminPanel;
