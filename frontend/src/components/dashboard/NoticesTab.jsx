import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Pin, AlertCircle, Calendar, FileText, Bell } from 'lucide-react';

const NoticesTab = ({ notices = [] }) => {
  const { isDarkMode } = useTheme();
  if (notices.length === 0) {
    return (
      <div className={`card-modern ${isDarkMode ? 'card-dark' : 'card-light'} text-center p-10`}>
        <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Notices</h3>
        <p className="text-slate-500">Your notice board is currently empty.</p>
      </div>
    );
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'exam': return <AlertCircle className="w-5 h-5" />;
      case 'event': return <Calendar className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getPriorityColors = (priority, isDark) => {
    switch (priority) {
      case 'high': return isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-100 text-red-900 border-red-300/80 font-extrabold shadow-2xs';
      case 'medium': return isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-100 text-amber-900 border-amber-300/80 font-extrabold shadow-2xs';
      default: return isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300/80 font-extrabold shadow-2xs';
    }
  };

  const getLeftBorderAccent = (notice) => {
    if (notice.is_pinned) return 'border-l-teal-500';
    if (notice.priority === 'high') return 'border-l-red-500';
    if (notice.priority === 'medium') return 'border-l-amber-500';
    return isDarkMode ? 'border-l-slate-600' : 'border-l-slate-400';
  };

  return (
    <div className={`card-modern ${isDarkMode ? 'card-dark' : 'card-light'} p-8`}>
      <h2 className="text-2xl font-extrabold mb-8 flex items-center gap-3 text-slate-900 dark:text-white">
        <span className="text-3xl">📌</span> Notice Board
      </h2>

      <div className="space-y-5">
        {notices.map(notice => (
          <div 
            key={notice.id} 
            className={`relative p-6 rounded-2xl border border-l-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${getLeftBorderAccent(notice)} ${
              notice.is_pinned 
                ? isDarkMode ? 'bg-teal-900/20 border-teal-500/30' : 'bg-teal-50/70 border-teal-200/90 shadow-2xs'
                : isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            {notice.is_pinned && (
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shadow-md text-white transform rotate-12">
                <Pin className="w-4 h-4" />
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getPriorityColors(notice.priority, isDarkMode)}`}>
                {getCategoryIcon(notice.category)}
                {notice.category}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">
                {new Date(notice.posted_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold ml-auto">
                Posted by <span className="font-extrabold text-slate-900 dark:text-slate-200">{notice.posted_by}</span>
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 pr-6">{notice.title}</h3>
            <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
              {notice.description}
            </p>

            {notice.attachment_url && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <a 
                  href={notice.attachment_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View Attachment
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoticesTab;
