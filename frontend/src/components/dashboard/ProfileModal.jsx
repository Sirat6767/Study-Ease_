import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import { X, User, Save, Loader2 } from 'lucide-react';
import AcademicBreadcrumb from '../ui/AcademicBreadcrumb';

const ProfileModal = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [personal, setPersonal] = useState({
    name: '', father_name: '', mother_name: '', contact_no: '', address: '', avatar_url: ''
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [academic, setAcademic] = useState(null);
  const [role, setRole] = useState('student');
  const [uniName, setUniName] = useState('');

  useEffect(() => {
    if (isOpen) fetchProfile();
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/student/profile');
      if (res.data.ok) {
        setRole(res.data.role);
        setUniName(res.data.uniName || '');
        setPersonal(prev => ({ ...prev, ...res.data.personal }));
        setAcademic(res.data.academic);
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
      const res = await api.put('/api/student/profile', {
        type: activeTab,
        data: activeTab === 'personal' ? personal : { reg_no: academic?.regNo }
      });
      if (res.data.ok) {
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        if (onClose) onClose(true);
      }
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.post('/api/student/upload-avatar', formData);

      if (res.data.ok) {
        setPersonal(prev => ({ ...prev, avatar_url: res.data.avatarUrl }));
        setSuccessMsg('Profile picture updated!');
        setTimeout(() => setSuccessMsg(''), 3000);
        if (onClose) onClose(true);
      }
    } catch (err) {
      alert('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
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
          <div className="flex items-center gap-4">
            <div className="relative group">
              {personal.avatar_url ? (
                <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${personal.avatar_url}`} alt="Avatar" className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-teal-500/20" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 shadow-md">
                  <User className="w-7 h-7" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <span className="text-white text-[10px] font-bold text-center leading-tight">Change<br/>Photo</span>}
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">Profile Settings</h2>
              <p className="text-xs text-slate-500">Update your photo and info</p>
            </div>
          </div>
          <button onClick={() => onClose && onClose(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 border-b dark:border-slate-800 relative">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`px-6 py-4 font-bold text-sm transition-all relative ${activeTab === 'personal' ? 'text-teal-500' : 'text-slate-500'}`}
          >
            Personal Info
            {activeTab === 'personal' && <span className="absolute bottom-0 left-0 w-full h-1 bg-teal-500 rounded-t-full"></span>}
          </button>
          {role !== 'admin' && (
            <button 
              onClick={() => setActiveTab('academic')}
              className={`px-6 py-4 font-bold text-sm transition-all relative ${activeTab === 'academic' ? 'text-teal-500' : 'text-slate-500'}`}
            >
              {role === 'university_moderator' ? 'University Info' : 'Academic Info'}
              {activeTab === 'academic' && <span className="absolute bottom-0 left-0 w-full h-1 bg-teal-500 rounded-t-full"></span>}
            </button>
          )}
          
          {successMsg && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-3 py-1 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              {successMsg}
            </div>
          )}
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
                  {role === 'university_moderator' ? (
                    <div className="p-6 rounded-2xl bg-teal-500/5 border border-teal-500/20">
                      <p className="text-sm text-teal-600 dark:text-teal-400 font-medium mb-1">Assigned University</p>
                      <h3 className="text-xl font-bold">{uniName || 'None'}</h3>
                      <p className="text-xs text-slate-500 mt-2 italic">* University assignment is managed by Admin.</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-6 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-3">
                        <p className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">Academic Hierarchy</p>
                        <AcademicBreadcrumb academic={academic} isDarkMode={isDarkMode} />
                        <p className="text-xs text-slate-500 pt-2 italic border-t border-slate-200/50 dark:border-slate-800">* Hierarchy can only be changed by Admin/Moderator.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500">Registration / ID Number</label>
                        <input className={inputClass} value={academic?.regNo || ''} onChange={e => setAcademic(a => ({ ...a, regNo: e.target.value }))} placeholder="Enter Reg No" />
                      </div>
                    </>
                  )}
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
