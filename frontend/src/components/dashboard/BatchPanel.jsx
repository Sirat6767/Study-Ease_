import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Users, Loader2, AlertCircle, Crown, GraduationCap, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import ConfirmModal from '../ui/ConfirmModal';


const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || localStorage.getItem('supabase.auth.token');
};

const BatchPanel = ({ userRole, academicData }) => {
  const { isDarkMode } = useTheme();
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => { fetchMembers(); }, [userRole]);

  const fetchMembers = async () => {
    setLoading(true); setError('');
    try {
      const token   = await getToken();

      // CRs use the CR endpoint; students use the student endpoint
      const url = userRole === 'cr'
        ? '/api/cr/batch-members'
        : '/api/student/batch-members';

      const res = await api.get(url);
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
      const res = await api.delete(`/api/cr/students/${confirmModal.studentId}`);
      if (res.data.ok) {
        setMembers(prev => prev.filter(m => m.userId !== confirmModal.studentId));
        setConfirmModal(null);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to remove student.');
      setConfirmModal(null);
    }
  };

  const card    = `card-modern ${isDarkMode ? 'card-dark' : 'card-light'} p-8`;
  const rowBase = isDarkMode ? 'list-row-dark' : 'list-row-light';
  const crRow   = isDarkMode ? 'bg-teal-900/20 border-teal-700/30' : 'bg-teal-50/80 border-teal-200 shadow-xs';

  const totalMembers = members.length;
  const cr = members.find(m => m.isCR);
  const students = members.filter(m => !m.isCR);

  return (
    <div className={card}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black flex items-center gap-3 text-teal-700 dark:text-teal-400">
          <span className="text-3xl">🏫</span> My Batch
        </h2>
        {academicData && (
          <div className="text-right">
            <p className="font-extrabold text-slate-900 dark:text-slate-100">{academicData.batchName}</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{academicData.deptCode} · {academicData.uniName}</p>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className={`flex flex-wrap items-center gap-6 p-5 rounded-2xl mb-8 border ${isDarkMode ? 'stats-bar-dark' : 'stats-bar-light'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-400 shadow-xs border border-teal-200/80 dark:border-teal-700/50">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">{totalMembers}</p>
            <p className="text-xs text-slate-800 dark:text-slate-300 font-extrabold uppercase tracking-wider">Total Members</p>
          </div>
        </div>
        <div className="w-px h-10 bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 shadow-xs border border-amber-200/80 dark:border-amber-700/50">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-950 dark:text-white">{cr?.name || 'Unassigned'}</p>
            <p className="text-xs text-slate-800 dark:text-slate-300 font-extrabold uppercase tracking-wider">Class Representative</p>
          </div>
        </div>
        <div className="w-px h-10 bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-xs border border-indigo-200/80 dark:border-indigo-700/50">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">{students.length}</p>
            <p className="text-xs text-slate-800 dark:text-slate-300 font-extrabold uppercase tracking-wider">Students</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50/90 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm font-semibold shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
        </div>
      ) : members.length === 0 ? (
        <div className={`p-12 rounded-2xl text-center border-2 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-300 bg-slate-50/50'}`}>
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 dark:text-slate-300 font-semibold">No members found in this batch.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Column headers */}
          <div className="grid grid-cols-12 px-4 py-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <span className="col-span-1">#</span>
            <span className="col-span-6">Name</span>
            <span className="col-span-4">Registration No.</span>
            {userRole === 'cr' && <span className="col-span-1 text-right">Action</span>}
          </div>

          {members.map((member, idx) => (
            <div
              key={member.userId}
              className={`grid grid-cols-12 px-4 py-3.5 rounded-xl border items-center transition-all ${
                member.isCR ? crRow : rowBase
              }`}
            >
              {/* Index */}
              <span className={`col-span-1 text-sm font-bold ${member.isCR ? 'text-teal-700 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {idx + 1}
              </span>

              {/* Name + CR badge */}
              <div className="col-span-6 flex items-center gap-3">
                {member.avatarUrl ? (
                  <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${member.avatarUrl}`} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-300 dark:border-slate-700 shadow-2xs" />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                    member.isCR
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                      : isDarkMode
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-200 text-slate-800 border border-slate-300'
                  }`}>
                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span className={`font-bold truncate ${member.isCR ? 'text-teal-800 dark:text-teal-300' : 'text-slate-900 dark:text-slate-100'}`}>
                  {member.name}
                </span>
                {member.isCR && (
                  <span className="badge-cr flex items-center gap-1 shrink-0">
                    <Crown className="w-3 h-3 text-amber-500" /> CR
                  </span>
                )}
              </div>

              {/* Reg No */}
              <span className={`col-span-4 font-mono text-sm ${
                member.isCR ? 'text-teal-800 dark:text-teal-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-bold'
              }`}>
                {member.regNo || '—'}
              </span>

              {/* Action */}
              {userRole === 'cr' && (
                <div className="col-span-1 text-right">
                  {!member.isCR && (
                    <button
                      onClick={() => setConfirmModal({ studentId: member.userId, studentName: member.name })}
                      className="p-1.5 text-red-500 hover:bg-red-100/70 hover:text-red-700 dark:hover:bg-red-500/20 rounded-lg transition-colors"
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

      <ConfirmModal
        isOpen={!!confirmModal}
        title="Remove Student?"
        message={`Are you sure you want to remove ${confirmModal?.studentName} from the batch?`}
        onConfirm={handleRemove}
        onCancel={() => setConfirmModal(null)}
        type="danger"
      />
    </div>
  );
};

export default BatchPanel;

