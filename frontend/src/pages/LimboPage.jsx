import { useState, useEffect } from 'react';
import { LogOut, Hourglass, BookOpen, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LimboPage = () => {
  const navigate = useNavigate();

  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selectedUni, setSelectedUni] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [regNo, setRegNo] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingRequest, setPendingRequest] = useState(null);
  const [rejectedRequest, setRejectedRequest] = useState(null);
  const [removedRequest, setRemovedRequest] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    checkStatusAndLoadData();
  }, []);

  const checkStatusAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('supabase.auth.token');

      if (!token) { navigate('/login'); return; }

      // Check if user already has a pending request via bootstrap
      const bootstrap = await axios.get(`${API_URL}/api/auth/bootstrap`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (bootstrap.data.ok) {
        const { academic, pendingRequest: pending, user } = bootstrap.data;

        // If already in a batch, go to dashboard
        const isPrivileged = ['admin', 'university_moderator'].includes(user?.role);
        if (isPrivileged || academic) {
          navigate('/dashboard');
          return;
        }

        // If pending or rejected request exists
        if (pending) {
          if (pending.status === 'rejected') {
            if (pending.message === 'SYSTEM:REMOVED') {
              setRemovedRequest(pending);
            } else {
              setRejectedRequest(pending);
            }
          } else if (pending.status === 'approved') {
            // If they have an approved request but are on the Limbo page, 
            // it means their academic_info was deleted (they were removed).
            setRemovedRequest(pending);
          } else {
            setPendingRequest(pending);
          }
          setLoading(false);
          return;
        }
      }

      // Load institutions for the join form
      const res = await axios.get(`${API_URL}/api/student/institutions`);
      if (res.data.ok) {
        setUniversities(res.data.universities);
        setDepartments(res.data.departments);
        setBatches(res.data.batches);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepts = departments.filter(d => d.uni_code === selectedUni);
  const filteredBatches = batches.filter(b => b.dept_id === parseInt(selectedDept));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedBatch || !regNo.trim()) {
      setError('Please select a batch and enter your registration number.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('supabase.auth.token');

      const res = await axios.post(
        `${API_URL}/api/student/join-batch`,
        { batchId: parseInt(selectedBatch), regNo: regNo.trim(), message: message.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px]"></div>
      </div>

      <div className="bg-white max-w-[520px] w-full p-10 rounded-3xl shadow-2xl relative z-10 border border-slate-100">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            rejectedRequest || removedRequest
              ? 'bg-gradient-to-br from-red-500 to-red-400 shadow-red-500/30' 
              : 'bg-gradient-to-br from-teal-600 to-teal-400 shadow-[0_0_30px_rgba(13,148,136,0.3)]'
          }`}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-slate-800">
              {removedRequest ? 'Removed From Batch' : rejectedRequest ? 'Application Rejected' : (pendingRequest || submitted ? 'Request Pending' : 'Join Your Batch')}
            </h1>
            <p className="text-slate-500 text-sm">StudyEase — Academic Platform</p>
          </div>
        </div>

        {/* REJECTED OR REMOVED STATE */}
        {rejectedRequest || removedRequest ? (
          <div className="text-center space-y-6">
            <div className="p-8 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-700 mb-2">
                {removedRequest ? 'Removed From Batch' : 'Application Rejected'}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {removedRequest 
                  ? <>You have been removed from your batch by the Class Representative.<br />You can apply again to regain access.</>
                  : <>Your request to join the batch was rejected by the Class Representative.<br />Please verify your information and try applying again.</>
                }
              </p>
            </div>
            
            <button
              onClick={() => { setRejectedRequest(null); setRemovedRequest(null); setError(''); }}
              className="w-full py-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              Apply Again
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 border-2 border-slate-200"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (pendingRequest || submitted) ? (
          <div className="text-center space-y-6">
            <div className="p-8 bg-violet-50 rounded-2xl border border-violet-100">
              <Hourglass className="w-16 h-16 text-violet-500 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-violet-700 mb-2">Awaiting Approval</h2>
              <p className="text-slate-600 leading-relaxed">
                Your request to join the batch has been submitted.<br />
                Please wait for your <strong>Class Representative (CR)</strong> to review and approve it.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">What happens next?</p>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                Your CR will review your registration number
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                Once approved, you'll get full dashboard access
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                You'll be auto-enrolled in all batch courses
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (
          /* JOIN FORM */
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-slate-600 leading-relaxed pb-1 border-b border-slate-100">
              Select your university, department, and batch below to request access.
            </p>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* University */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 text-sm">University</label>
              <select
                value={selectedUni}
                onChange={e => { setSelectedUni(e.target.value); setSelectedDept(''); setSelectedBatch(''); }}
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
                required
              >
                <option value="">— Select University —</option>
                {universities.map(u => (
                  <option key={u.uni_code} value={u.uni_code}>{u.uni_name}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 text-sm">Department</label>
              <select
                value={selectedDept}
                onChange={e => { setSelectedDept(e.target.value); setSelectedBatch(''); }}
                disabled={!selectedUni}
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="">— Select Department —</option>
                {filteredDepts.map(d => (
                  <option key={d.dept_id} value={d.dept_id}>{d.dept_name} ({d.dept_code})</option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 text-sm">Batch</label>
              <select
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
                disabled={!selectedDept}
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="">— Select Batch —</option>
                {filteredBatches.map(b => (
                  <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
                ))}
              </select>
            </div>

            {/* Registration Number */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 text-sm">Registration Number</label>
              <input
                type="text"
                placeholder="e.g. 2021-1-60-001"
                value={regNo}
                onChange={e => setRegNo(e.target.value)}
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
                required
              />
            </div>

            {/* Optional message */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 text-sm">Message to CR <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                placeholder="Any note to your CR..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-7 py-4 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-2xl text-lg font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(13,148,136,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Apply to Join <ArrowRight className="w-5 h-5" /></>}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-4 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center justify-center gap-2 border-2 border-transparent hover:border-slate-200"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LimboPage;
