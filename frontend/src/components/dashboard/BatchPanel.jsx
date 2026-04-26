import { useState, useEffect } from 'react';
import { Users, Loader2, AlertCircle, Crown, GraduationCap, Trash2 } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || localStorage.getItem('supabase.auth.token');
};

const BatchPanel = ({ isDarkMode, userRole, academicData }) => {
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => { fetchMembers(); }, [userRole]);

  const fetchMembers = async () => {
    setLoading(true); setError('');
    try {
      const token   = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // CRs use the CR endpoint; students use the student endpoint
      const url = userRole === 'cr'
        ? `${API}/api/cr/batch-members`
        : `${API}/api/student/batch-members`;

      const res = await axios.get(url, { headers });
      if (res.data.ok) setMembers(res.data.members);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load batch members.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmModal) return;
    try {
      const token = await getToken();
      const res = await axios.delete(`${API}/api/cr/students/${confirmModal.studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.ok) {
        setMembers(prev => prev.filter(m => m.userId !== confirmModal.studentId));
        setConfirmModal(null);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to remove student.');
      setConfirmModal(null);
    }
  };

  const card    = isDarkMode ? 'bg-slate-900 border-slate-800'  : 'bg-white border-white/80 shadow-md';
  const rowBase = isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200';
  const crRow   = isDarkMode ? 'bg-teal-900/30 border-teal-700/50' : 'bg-teal-50 border-teal-200';

  const totalMembers = members.length;
  const cr = members.find(m => m.isCR);
  const students = members.filter(m => !m.isCR);

  return (
    <div className={`p-8 rounded-3xl border ${card}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-teal-600 dark:text-teal-400">
          <span className="text-3xl">🏫</span> My Batch
        </h2>
        {academicData && (
          <div className="text-right">
            <p className="font-bold text-slate-700 dark:text-slate-200">{academicData.batchName}</p>
            <p className="text-sm text-slate-500">{academicData.deptCode} · {academicData.uniName}</p>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className={`flex items-center gap-6 p-4 rounded-2xl mb-8 border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-500" />
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-white">{totalMembers}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Members</p>
          </div>
        </div>
        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <div>
            <p className="font-bold text-slate-800 dark:text-white">{cr?.name || 'Unassigned'}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Class Representative</p>
          </div>
        </div>
        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-white">{students.length}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Students</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      ) : members.length === 0 ? (
        <div className={`p-12 rounded-2xl text-center border-2 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No members found in this batch.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-12 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span className="col-span-1">#</span>
            <span className="col-span-6">Name</span>
            <span className="col-span-4">Registration No.</span>
            {userRole === 'cr' && <span className="col-span-1 text-right">Action</span>}
          </div>

          {members.map((member, idx) => (
            <div
              key={member.userId}
              className={`grid grid-cols-12 px-4 py-3 rounded-xl border items-center transition-all hover:shadow-sm ${
                member.isCR ? crRow : rowBase
              }`}
            >
              {/* Index */}
              <span className={`col-span-1 text-sm font-bold ${member.isCR ? 'text-teal-500' : 'text-slate-400'}`}>
                {idx + 1}
              </span>

              {/* Name + CR badge */}
              <div className="col-span-6 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  member.isCR
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                    : isDarkMode
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-slate-200 text-slate-600'
                }`}>
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className={`font-semibold truncate ${member.isCR ? 'text-teal-600 dark:text-teal-400' : ''}`}>
                  {member.name}
                </span>
                {member.isCR && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold shrink-0">
                    <Crown className="w-3 h-3" /> CR
                  </span>
                )}
              </div>

              {/* Reg No */}
              <span className={`col-span-4 font-mono text-sm ${
                member.isCR ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500'
              }`}>
                {member.regNo || '—'}
              </span>

              {/* Action */}
              {userRole === 'cr' && (
                <div className="col-span-1 text-right">
                  {!member.isCR && (
                    <button
                      onClick={() => setConfirmModal({ studentId: member.userId, studentName: member.name })}
                      className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center ${
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-black mb-2">Remove Student?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Are you sure you want to remove <span className="font-bold text-slate-700 dark:text-slate-300">{confirmModal.studentName}</span> from the batch?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchPanel;
