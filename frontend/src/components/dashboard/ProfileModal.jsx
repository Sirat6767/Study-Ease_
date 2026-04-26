import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, User, Book, Save, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProfileModal = ({ isOpen, onClose, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [personal, setPersonal] = useState({
    name: '',
    father_name: '',
    mother_name: '',
    contact_no: '',
    address: ''
  });
  const [academic, setAcademic] = useState({
    reg_no: '',
    dept_name: '',
    batch_name: ''
  });

  useEffect(() => {
    if (isOpen) fetchProfile();
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const res = await axios.get(`${API}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.ok) {
        setPersonal(prev => ({ ...prev, ...res.data.personal }));
        setAcademic(prev => ({ ...prev, ...res.data.academic }));
      }
    } catch (err) {
      console.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const res = await axios.put(`${API}/api/student/profile`, {
        type: activeTab,
        data: activeTab === 'personal' ? personal : academic
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.ok) {
        alert('Profile updated successfully!');
      }
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none transition-all ${
    isDarkMode 
      ? 'bg-slate-900 border-slate-700 focus:border-teal-500 text-white' 
      : 'bg-white border-slate-200 focus:border-teal-500'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`}>
        {/* Header */}
        <div className={`px-8 py-6 flex justify-between items-center border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Profile Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 border-b dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`px-6 py-4 font-bold text-sm transition-all relative ${activeTab === 'personal' ? 'text-teal-500' : 'text-slate-500'}`}
          >
            Personal Info
            {activeTab === 'personal' && <span className="absolute bottom-0 left-0 w-full h-1 bg-teal-500 rounded-t-full"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('academic')}
            className={`px-6 py-4 font-bold text-sm transition-all relative ${activeTab === 'academic' ? 'text-teal-500' : 'text-slate-500'}`}
          >
            Academic Info
            {activeTab === 'academic' && <span className="absolute bottom-0 left-0 w-full h-1 bg-teal-500 rounded-t-full"></span>}
          </button>
        </div>

        {/* Body */}
        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-teal-500 mb-4" />
              <p className="text-slate-500">Loading profile data...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {activeTab === 'personal' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Full Name</label>
                    <input className={inputClass} value={personal.name} onChange={e => setPersonal({...personal, name: e.target.value})} placeholder="Full Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Contact Number</label>
                    <input className={inputClass} value={personal.contact_no} onChange={e => setPersonal({...personal, contact_no: e.target.value})} placeholder="Phone" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Father's Name</label>
                    <input className={inputClass} value={personal.father_name} onChange={e => setPersonal({...personal, father_name: e.target.value})} placeholder="Father's Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Mother's Name</label>
                    <input className={inputClass} value={personal.mother_name} onChange={e => setPersonal({...personal, mother_name: e.target.value})} placeholder="Mother's Name" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-500">Address</label>
                    <textarea className={`${inputClass} min-h-[100px] py-3`} value={personal.address} onChange={e => setPersonal({...personal, address: e.target.value})} placeholder="Permanent Address" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-teal-500/5 border border-teal-500/20">
                    <p className="text-sm text-teal-600 dark:text-teal-400 font-medium mb-1">Assigned Department & Batch</p>
                    <h3 className="text-xl font-bold">{academic.dept_name} - {academic.batch_name}</h3>
                    <p className="text-xs text-slate-500 mt-2 italic">* Department and Batch can only be changed by Admin/Moderator.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Registration / ID Number</label>
                    <input className={inputClass} value={academic.reg_no} onChange={e => setAcademic({...academic, reg_no: e.target.value})} placeholder="Enter Reg No" />
                  </div>
                </div>
              )}

              <div className="pt-6 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl font-bold shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
