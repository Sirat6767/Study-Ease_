import { Sun, Moon, LogOut, Loader2, Settings, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import OverviewTab from '../components/dashboard/OverviewTab';
import CoursesTab from '../components/dashboard/CoursesTab';
import NoticesTab from '../components/dashboard/NoticesTab';
import CRPanel from '../components/dashboard/CRPanel';
import AdminPanel from '../components/dashboard/AdminPanel';
import ModeratorPanel from '../components/dashboard/ModeratorPanel';
import ProfileModal from '../components/dashboard/ProfileModal';
import BatchPanel from '../components/dashboard/BatchPanel';
import NotificationPanel from '../components/dashboard/NotificationPanel';
import ConfirmModal from '../components/ui/ConfirmModal';
import ErrorBoundary from '../components/ErrorBoundary';
import ChatPanel from '../components/dashboard/ChatPanel';
import AcademicBreadcrumb from '../components/ui/AcademicBreadcrumb';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [loading, setLoading]           = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData]           = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    exams: [],
    tasks: [],
    archivedTasks: [],
    enrollments: [],
    courseFiles: [],
    notices: []
  });

  useEffect(() => {
    fetchDashboardData();
    fetchUnreadCount();
    const int = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(int);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await api.get('/api/notifications/unread-count');
      if (res.data.ok) setUnreadCount(res.data.count);
    } catch (e) { console.error('Failed to fetch unread count'); }
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('supabase.auth.token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      if (session?.access_token) {
        localStorage.setItem('supabase.auth.token', session.access_token);
      }
      
      const res = await api.get('/api/auth/bootstrap');
      
      if (res.data.ok) {
        setUserData(res.data.user);
        setAcademicData(res.data.academic);
        setDashboardData({
          exams: res.data.exams,
          tasks: res.data.tasks,
          archivedTasks: res.data.archivedTasks,
          enrollments: res.data.enrollments,
          courseFiles: res.data.courseFiles,
          notices: res.data.notices
        });
        
        const role = res.data.user?.role;
        const isPrivileged = ['admin', 'university_moderator'].includes(role);
        if (isPrivileged || res.data.academic) {
          if (role === 'admin') {
            setActiveTab('admin_panel');
          } else if (role === 'university_moderator') {
            setActiveTab('moderator_panel');
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

  const handleLogout = async () => {
    setLogoutConfirm(false);
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : ''}`} style={!isDarkMode ? { background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 40%, #eef2ff 100%)' } : {}}>
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white' : 'text-slate-800'}`}
      style={!isDarkMode ? { background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 40%, #eef2ff 100%)' } : {}}
    >
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] ${isDarkMode ? 'bg-teal-500/10' : 'bg-teal-400/20'}`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[30%] h-[40%] rounded-full blur-[100px] ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-400/15'}`}></div>
        <div className={`absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full blur-[100px] ${isDarkMode ? 'bg-pink-500/10' : 'bg-teal-300/15'}`}></div>
      </div>

      {/* Navbar */}
      <nav className={`sticky top-0 z-50 px-8 py-4 flex justify-between items-center border-b transition-all duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-700/50 backdrop-blur-xl' : 'bg-white/90 border-slate-200/80 backdrop-blur-xl shadow-[0_1px_12px_rgba(15,23,42,0.08)]'}`}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Study Ease" className="h-10 w-auto object-contain shrink-0" onError={(e) => e.target.style.display='none'} />
          <div className="flex flex-col justify-center">
            <h1 className="font-sans text-2xl font-black tracking-tight leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">Study </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-teal-300">Ease</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wide mt-1 hidden sm:block">Simpler learning, better results.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-colors ${
              isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 relative rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </button>

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

      <ConfirmModal
        isOpen={logoutConfirm}
        title="Sign Out?"
        message="You'll need to log in again to access your account."
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirm(false)}
        type="danger"
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={(refresh) => {
          setIsProfileOpen(false);
          if (refresh === true) fetchDashboardData();
        }} 
      />

      {/* Notifications Panel */}
      <NotificationPanel 
        isOpen={isNotificationsOpen} 
        onClose={() => { setIsNotificationsOpen(false); fetchUnreadCount(); }} 
      />

      {/* Chat Panel */}
      {(userData?.role === 'student' || userData?.role === 'cr') && academicData && (
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          batchId={academicData.batch?.id}
          crUserId={dashboardData.notices[0]?.batch_id}
          currentUserId={userData.id}
          userRole={userData.role}
          isCR={userData.role === 'cr'}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 relative z-10">
        
        {/* Academic Header */}
        <div className={`mb-8 card-modern ${isDarkMode ? 'card-dark' : 'card-light border-l-4 border-l-teal-500'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
          <div className="flex items-center gap-4">
            {userData?.avatarUrl ? (
              <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${userData.avatarUrl}`} alt="Profile" className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-teal-500/20" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-xs">
                {(userData?.name || userData?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-xl font-black text-slate-950 dark:text-white">{userData?.name || userData?.email || 'Loading...'}</h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm font-bold mt-0.5">
                {academicData?.regNo ? `Reg: ${academicData.regNo}` : userData?.email}
              </p>
            </div>
          </div>

          {academicData && (
            <div className="sm:text-right flex flex-col items-end gap-2">
              <AcademicBreadcrumb academic={academicData} isDarkMode={isDarkMode} />
              <button
                onClick={() => setIsChatOpen(true)}
                className="px-4 py-1.5 bg-indigo-100/90 hover:bg-indigo-200/90 text-indigo-900 border border-indigo-300/80 rounded-xl text-sm font-extrabold transition-all dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/20 flex items-center gap-2 shadow-2xs mt-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {userData?.role === 'cr' ? 'Student Messages' : 'Chat with CR'}
              </button>
            </div>
          )}
        </div>

        {/* Dashboard Tabs */}
        {userData?.role !== 'admin' && userData?.role !== 'university_moderator' && (
          <div className={`flex flex-wrap gap-2 sm:gap-3 p-2 rounded-2xl mb-8 w-fit ${isDarkMode ? 'bg-slate-900/80 backdrop-blur-md shadow-lg shadow-black/20 border border-slate-800' : 'bg-white/95 backdrop-blur-sm shadow-sm border border-slate-300/90'}`}>
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black transition-all ${
                activeTab === 'overview' 
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_6px_20px_rgba(13,148,136,0.35)] ring-2 ring-teal-500/20' 
                  : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold'
              }`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('courses')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black transition-all ${
                activeTab === 'courses' 
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_6px_20px_rgba(13,148,136,0.35)] ring-2 ring-teal-500/20' 
                  : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold'
              }`}
            >
              Courses & Grades
            </button>
            <button 
              onClick={() => setActiveTab('notices')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black transition-all ${
                activeTab === 'notices' 
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_6px_20px_rgba(13,148,136,0.35)] ring-2 ring-teal-500/20' 
                  : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold'
              }`}
            >
              Notice Board
            </button>
            {(userData?.role === 'student' || userData?.role === 'cr') && (
              <button
                onClick={() => setActiveTab('my_batch')}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black transition-all ${
                  activeTab === 'my_batch'
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_6px_20px_rgba(13,148,136,0.35)] ring-2 ring-teal-500/20'
                    : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold'
                }`}
              >
                My Batch
              </button>
            )}
            {userData?.role === 'cr' && (
              <button 
                onClick={() => setActiveTab('cr_panel')}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black transition-all ${
                  activeTab === 'cr_panel' 
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_6px_20px_rgba(13,148,136,0.35)] ring-2 ring-teal-500/20' 
                    : isDarkMode ? 'text-teal-400 hover:bg-teal-900/30' : 'text-teal-900 bg-teal-100/90 hover:bg-teal-200/90 border border-teal-300/80 font-bold'
                }`}
              >
                CR Panel
              </button>
            )}
          </div>
        )}

        {/* Admin-only tab bar */}
        {userData?.role === 'admin' && (
          <div className={`flex flex-wrap gap-2 sm:gap-3 p-2 rounded-2xl mb-8 w-fit ${isDarkMode ? 'bg-slate-900/80 backdrop-blur-md shadow-lg shadow-black/20 border border-slate-800' : 'bg-white/95 backdrop-blur-sm shadow-sm border border-slate-200/90'}`}>
            <button
              onClick={() => setActiveTab('admin_panel')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'admin_panel'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_6px_20px_rgba(13,148,136,0.35)] ring-2 ring-teal-500/20'
                  : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              System Admin
            </button>
            <button
              onClick={() => setActiveTab('moderator_panel')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'moderator_panel'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_6px_20px_rgba(13,148,136,0.35)] ring-2 ring-teal-500/20'
                  : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              University View
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <ErrorBoundary key="overview">
            <OverviewTab 
              exams={dashboardData.exams} 
              tasks={dashboardData.tasks} 
              archivedTasks={dashboardData.archivedTasks}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'courses' && (
          <ErrorBoundary key="courses">
            <CoursesTab 
              enrollments={dashboardData.enrollments}
              courseFiles={dashboardData.courseFiles}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'notices' && (
          <ErrorBoundary key="notices">
            <NoticesTab 
              notices={dashboardData.notices}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'cr_panel' && userData?.role === 'cr' && (
          <ErrorBoundary key="cr_panel">
            <CRPanel />
          </ErrorBoundary>
        )}
        {activeTab === 'admin_panel' && userData?.role === 'admin' && (
          <ErrorBoundary key="admin_panel">
            <AdminPanel isDarkMode={isDarkMode} />
          </ErrorBoundary>
        )}
        {activeTab === 'moderator_panel' && (userData?.role === 'university_moderator' || userData?.role === 'admin') && (
          <ErrorBoundary key="moderator_panel">
            <ModeratorPanel isDarkMode={isDarkMode} />
          </ErrorBoundary>
        )}
        {activeTab === 'my_batch' && (userData?.role === 'student' || userData?.role === 'cr') && (
          <ErrorBoundary key="my_batch">
            <BatchPanel
              userRole={userData?.role}
              academicData={academicData}
            />
          </ErrorBoundary>
        )}

      </main>
    </div>
  );
};

export default Dashboard;
