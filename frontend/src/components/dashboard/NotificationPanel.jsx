import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, Check, Trash2, X, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';


const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || localStorage.getItem('supabase.auth.token');
};

const NotificationPanel = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications');
      if (res.data.ok) {
        setNotifications(res.data.notifications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] z-[110] shadow-2xl flex flex-col transform transition-transform duration-300 ${
        isDarkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'
      }`}>
        <div className={`px-6 py-4 flex items-center justify-between ${isDarkMode ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-500" />
            <h2 className="text-xl font-bold">Notifications</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 flex justify-end">
          <button onClick={markAllAsRead} className="text-sm font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
            Mark all as read
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center p-8"><AlertCircle className="w-6 h-6 animate-pulse text-slate-400" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`p-4 rounded-xl cursor-pointer transition-colors border ${
                  n.is_read 
                    ? (isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100') 
                    : (isDarkMode ? 'bg-teal-900/20 border-teal-500/30' : 'bg-teal-50 border-teal-200')
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className={`text-sm font-bold mb-1 ${!n.is_read ? 'text-teal-700 dark:text-teal-300' : ''}`}>{n.title}</h4>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{n.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 mt-1" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
