import { useState, useEffect } from 'react';
import { LogOut, Hourglass, BookOpen, ArrowRight, Loader2, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const LimboPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [universities, setUniversities] = useState([]);
  const [faculties, setFaculties]       = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [batches, setBatches]           = useState([]);

  const [selectedUni, setSelectedUni]         = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDept, setSelectedDept]       = useState('');
  const [selectedBatch, setSelectedBatch]     = useState('');
  const [regNo, setRegNo]                     = useState('');
  const [message, setMessage]                 = useState('');

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [pendingRequest, setPendingRequest]   = useState(null);
  const [rejectedRequest, setRejectedRequest] = useState(null);
  const [removedRequest, setRemovedRequest]   = useState(null);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    checkStatusAndLoadData();
  }, []);

  const checkStatusAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('supabase.auth.token');

      if (!token) { navigate('/login'); return; }

      const bootstrap = await api.get('/api/auth/bootstrap');

      if (bootstrap.data.ok) {
        const { academic, pendingRequest: pending, user } = bootstrap.data;

        const isPrivileged = ['admin', 'university_moderator'].includes(user?.role);
        if (isPrivileged || academic) {
          navigate('/dashboard');
          return;
        }

        if (pending) {
          if (pending.status === 'rejected') {
            if (pending.message === 'SYSTEM:REMOVED') {
              setRemovedRequest(pending);
            } else {
              setRejectedRequest(pending);
            }
          } else if (pending.status === 'approved') {
            setRemovedRequest(pending);
          } else {
            setPendingRequest(pending);
          }
        }
      }

      // Single call to load complete academic hierarchy
      const res = await api.get('/api/academic/hierarchy');
      if (res.data.ok) {
        setUniversities(res.data.universities || []);
        setFaculties(res.data.faculties || []);
        setDepartments(res.data.departments || []);
        setBatches(res.data.batches || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Safe string-based cascading filters
  const filteredFaculties = faculties.filter(f => String(f.university_id) === String(selectedUni));
  const filteredDepts     = departments.filter(d => String(d.faculty_id) === String(selectedFaculty));
  const filteredBatches   = batches.filter(b => String(b.department_id) === String(selectedDept));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedBatch || !regNo.trim()) {
      setError('Please select a batch and enter your registration number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(
        '/api/student/join-batch',
        { batchId: parseInt(selectedBatch), regNo: regNo.trim(), message: message.trim() || undefined }
      );

      if (res.data.ok) {
        setSubmitted(true);
        setPendingRequest({ status: 'pending', batchId: selectedBatch });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    navigate('/login');
  };

  const fieldInputClass = `w-full appearance-none px-4 py-3.5 pr-10 border-2 rounded-xl text-sm font-bold transition-all outline-none disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed ${
    isDarkMode 
      ? 'bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20' 
      : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 shadow-sm'
  }`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <Loader2 className="w-12 h-12 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 relative ${isDarkMode ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-200'}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px]"></div>
      </div>

      <div className={`max-w-[540px] w-full p-8 sm:p-10 rounded-3xl relative z-10 border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/95 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
          : 'bg-white/95 border-slate-200 shadow-[0_15px_45px_rgba(15,23,42,0.12)]'
      }`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            rejectedRequest || removedRequest
              ? 'bg-gradient-to-br from-red-500 to-red-400 shadow-red-500/30' 
              : 'bg-gradient-to-br from-teal-600 to-teal-400 shadow-[0_0_30px_rgba(13,148,136,0.3)]'
          }`}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {removedRequest ? 'Removed From Batch' : rejectedRequest ? 'Application Rejected' : (pendingRequest || submitted ? 'Request Pending' : 'Join Your Batch')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-0.5">StudyEase — Academic Management</p>
          </div>
        </div>

        {rejectedRequest || removedRequest ? (
          <div className="text-center space-y-6">
            <div className="p-8 bg-red-50/90 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-red-800 dark:text-red-300 mb-2">
                {removedRequest ? 'Removed From Batch' : 'Application Rejected'}
              </h2>
              <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                {removedRequest 
                  ? <>You have been removed from your batch by the Class Representative.<br />You can apply again to regain access.</>
                  : <>Your request to join the batch was rejected by the Class Representative.<br />Please verify your information and try applying again.</>
                }
              </p>
            </div>
            
            <button
              onClick={() => { setRejectedRequest(null); setRemovedRequest(null); setError(''); }}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-black hover:from-red-700 hover:to-red-600 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              Apply Again
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 border-2 border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (pendingRequest || submitted) ? (
          <div className="text-center space-y-6">
            <div className="p-8 bg-violet-50/90 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-900/50">
              <Hourglass className="w-16 h-16 text-violet-600 dark:text-violet-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-black text-violet-800 dark:text-violet-300 mb-2">Awaiting Approval</h2>
              <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                Your request to join the batch has been submitted.<br />
                Please wait for your <strong>Class Representative (CR)</strong> to review and approve it.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-3">
              <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">What happens next?</p>
              <div className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                Your CR will review your registration number
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                Once approved, you'll get full dashboard access
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                You'll be auto-enrolled in all batch courses
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 border-2 border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (
          /* JOIN FORM — 4-TIER CASCADING SELECT */
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold leading-relaxed pb-3 border-b border-slate-200 dark:border-slate-800">
              Select your university, faculty, department, and batch below to request access.
            </p>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {/* 1. University */}
            <div className="space-y-1.5">
              <label htmlFor="university-select" className="block font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                1. University <span className="text-teal-600 dark:text-teal-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="university-select"
                  value={selectedUni}
                  onChange={e => { 
                    setSelectedUni(e.target.value); 
                    setSelectedFaculty(''); 
                    setSelectedDept(''); 
                    setSelectedBatch(''); 
                  }}
                  className={fieldInputClass}
                  required
                >
                  <option value="" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">— Select University —</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">
                      {u.university_name} ({u.university_code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. Faculty */}
            <div className="space-y-1.5">
              <label htmlFor="faculty-select" className="block font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                2. Faculty <span className="text-teal-600 dark:text-teal-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="faculty-select"
                  value={selectedFaculty}
                  onChange={e => { 
                    setSelectedFaculty(e.target.value); 
                    setSelectedDept(''); 
                    setSelectedBatch(''); 
                  }}
                  disabled={!selectedUni}
                  className={fieldInputClass}
                  required
                >
                  <option value="" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">— Select Faculty —</option>
                  {filteredFaculties.map(f => (
                    <option key={f.id} value={f.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">
                      {f.faculty_name} {f.faculty_code ? `(${f.faculty_code})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 3. Department */}
            <div className="space-y-1.5">
              <label htmlFor="department-select" className="block font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                3. Department <span className="text-teal-600 dark:text-teal-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="department-select"
                  value={selectedDept}
                  onChange={e => { 
                    setSelectedDept(e.target.value); 
                    setSelectedBatch(''); 
                  }}
                  disabled={!selectedFaculty}
                  className={fieldInputClass}
                  required
                >
                  <option value="" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">— Select Department —</option>
                  {filteredDepts.map(d => (
                    <option key={d.id} value={d.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">
                      {d.department_name} ({d.department_code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 4. Batch */}
            <div className="space-y-1.5">
              <label htmlFor="batch-select" className="block font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                4. Batch <span className="text-teal-600 dark:text-teal-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="batch-select"
                  value={selectedBatch}
                  onChange={e => setSelectedBatch(e.target.value)}
                  disabled={!selectedDept}
                  className={fieldInputClass}
                  required
                >
                  <option value="" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">— Select Batch —</option>
                  {filteredBatches.map(b => (
                    <option key={b.id} value={b.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold">
                      {b.batch_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Registration Number */}
            <div className="space-y-1.5">
              <label htmlFor="regno-input" className="block font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                Registration Number <span className="text-teal-600 dark:text-teal-400">*</span>
              </label>
              <input
                id="regno-input"
                type="text"
                placeholder="e.g. 2021-1-60-001"
                value={regNo}
                onChange={e => setRegNo(e.target.value)}
                className={fieldInputClass}
                required
              />
            </div>

            {/* Optional message */}
            <div className="space-y-1.5">
              <label htmlFor="message-input" className="block font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                Message to CR <span className="text-slate-400 font-medium lowercase">(optional)</span>
              </label>
              <textarea
                id="message-input"
                placeholder="Any note to your CR..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                className={`${fieldInputClass} resize-none`}
              />
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-7 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-2xl text-base font-black cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(13,148,136,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Apply to Join <ArrowRight className="w-5 h-5" /></>}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 border-2 border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LimboPage;
