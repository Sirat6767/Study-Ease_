import { Sun, Moon, LogOut, BookOpen, User, Loader2, Settings, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import OverviewTab from '../components/dashboard/OverviewTab';
import CoursesTab from '../components/dashboard/CoursesTab';
import NoticesTab from '../components/dashboard/NoticesTab';
import CRPanel from '../components/dashboard/CRPanel';
import AdminPanel from '../components/dashboard/AdminPanel';
import ProfileModal from '../components/dashboard/ProfileModal';
import BatchPanel from '../components/dashboard/BatchPanel';
import NotificationPanel from '../components/dashboard/NotificationPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [loading, setLoading]           = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [userData, setUserData]           = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    exams: [],
    tasks: [],
    enrollments: [],
    courseFiles: [],
    notices: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get session from Supabase (it manages the token automatically)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('supabase.auth.token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      // Keep token in sync
      if (session?.access_token) {
        localStorage.setItem('supabase.auth.token', session.access_token);
      }
      
      const res = await axios.get(`${API_URL}/api/auth/bootstrap`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.ok) {
        setUserData(res.data.user);
        setAcademicData(res.data.academic);
        setDashboardData({
          exams: res.data.exams,
          tasks: res.data.tasks,
          enrollments: res.data.enrollments,
          courseFiles: res.data.courseFiles,
          notices: res.data.notices
        });
        
        // Redirect students/CRs without a batch to limbo
        const role = res.data.user?.role;
        const isPrivileged = ['admin', 'university_moderator'].includes(role);
        if (isPrivileged || res.data.academic) {
          if (role === 'admin') {
            setActiveTab('admin_panel');
          }
        } else {
          navigate('/limbo');
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('supabase.auth.token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const handleLogout = async () => {
    setLogoutConfirm(false);
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-800'}`}>
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-800'}`}>
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[100px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className={`sticky top-0 z-50 px-8 py-4 flex justify-between items-center border-b transition-all duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-700/50 backdrop-blur-xl' : 'bg-white/80 border-white/50 backdrop-blur-xl shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-400 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(13,148,136,0.2)]">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-extrabold bg-gradient-to-r from-teal-600 to-teal-400 text-transparent bg-clip-text">StudyEase</h1>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 relative rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          >
            <Bell className="w-5 h-5" />
            {/* Optional: notification badge could go here if we fetched unread count */}
          </button>

          {/* Profile button — all roles */}
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-xl font-semibold transition-colors dark:bg-teal-500/10 dark:hover:bg-teal-500/20 dark:text-teal-400"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </button>
          
          <button onClick={() => setLogoutConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold transition-colors dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation */}
      {logoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center ${
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-black mb-2">Sign Out?</h3>
            <p className="text-slate-500 text-sm mb-6">You'll need to log in again to access your account.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        isDarkMode={isDarkMode} 
      />

      {/* Notifications Panel */}
      <NotificationPanel 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        isDarkMode={isDarkMode} 
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 relative z-10">
        
        {/* Academic Header */}
        <div className={`mb-8 p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-white font-black text-xl">
              {(userData?.name || userData?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold">{userData?.name || userData?.email || 'Loading...'}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {academicData ? `Reg: ${academicData.regNo}` : userData?.email}
              </p>
            </div>
          </div>
          {academicData && (
            <div className="sm:text-right">
              <h4 className="text-lg font-bold text-teal-600 dark:text-teal-400">{academicData.batchName} ({academicData.deptCode})</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{academicData.uniName}</p>
            </div>
          )}
        </div>

        {/* Dashboard Tabs */}
        {userData?.role !== 'admin' && (
          <div className={`flex flex-wrap gap-2 sm:gap-3 p-2 rounded-2xl mb-8 w-fit ${isDarkMode ? 'bg-slate-900' : 'bg-white shadow-sm'}`}>
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'overview' 
                  ? 'bg-gradient-to-r from-teal-600 to-teal-400 text-white shadow-[0_8px_25px_rgba(13,148,136,0.4)]' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('courses')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'courses' 
                  ? 'bg-gradient-to-r from-teal-600 to-teal-400 text-white shadow-[0_8px_25px_rgba(13,148,136,0.4)]' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Courses & Grades
            </button>
            <button 
              onClick={() => setActiveTab('notices')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'notices' 
                  ? 'bg-gradient-to-r from-teal-600 to-teal-400 text-white shadow-[0_8px_25px_rgba(13,148,136,0.4)]' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Notice Board
            </button>
            {/* My Batch tab — visible to students and CRs */}
            {(userData?.role === 'student' || userData?.role === 'cr') && (
              <button
                onClick={() => setActiveTab('my_batch')}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'my_batch'
                    ? 'bg-gradient-to-r from-teal-600 to-teal-400 text-white shadow-[0_8px_25px_rgba(13,148,136,0.4)]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                My Batch
              </button>
            )}
            {userData?.role === 'cr' && (
              <button 
                onClick={() => setActiveTab('cr_panel')}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'cr_panel' 
                    ? 'bg-gradient-to-r from-teal-600 to-teal-400 text-white shadow-[0_8px_25px_rgba(13,148,136,0.4)]' 
                    : 'text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                }`}
              >
                CR Panel
              </button>
            )}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab 
            isDarkMode={isDarkMode} 
            exams={dashboardData.exams} 
            tasks={dashboardData.tasks} 
          />
        )}
        {activeTab === 'courses' && (
          <CoursesTab 
            isDarkMode={isDarkMode} 
            enrollments={dashboardData.enrollments}
            courseFiles={dashboardData.courseFiles}
          />
        )}
        {activeTab === 'notices' && (
          <NoticesTab 
            isDarkMode={isDarkMode} 
            notices={dashboardData.notices}
          />
        )}
        {activeTab === 'cr_panel' && userData?.role === 'cr' && (
          <CRPanel isDarkMode={isDarkMode} />
        )}
        {activeTab === 'admin_panel' && userData?.role === 'admin' && (
          <AdminPanel isDarkMode={isDarkMode} />
        )}
        {activeTab === 'my_batch' && (userData?.role === 'student' || userData?.role === 'cr') && (
          <BatchPanel
            isDarkMode={isDarkMode}
            userRole={userData?.role}
            academicData={academicData}
          />
        )}

      </main>
    </div>
  );
};

export default Dashboard;
