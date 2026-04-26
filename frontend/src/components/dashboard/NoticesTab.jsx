import React from 'react';
import { Pin, AlertCircle, Calendar, FileText, Bell } from 'lucide-react';

const NoticesTab = ({ isDarkMode, notices = [] }) => {
  if (notices.length === 0) {
    return (
      <div className={`p-10 rounded-3xl text-center border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/80 shadow-md'}`}>
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
      case 'high': return isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100';
      case 'medium': return isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-100';
      default: return isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/80 shadow-md'}`}>
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
        <span className="text-3xl">📌</span> Notice Board
      </h2>

      <div className="space-y-6">
        {notices.map(notice => (
          <div 
            key={notice.id} 
            className={`relative p-6 rounded-2xl border transition-shadow hover:shadow-lg ${
              notice.is_pinned 
                ? isDarkMode ? 'bg-teal-900/20 border-teal-500/30' : 'bg-teal-50/50 border-teal-200'
                : isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            {notice.is_pinned && (
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shadow-lg text-white transform rotate-12">
                <Pin className="w-4 h-4" />
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getPriorityColors(notice.priority, isDarkMode)}`}>
                {getCategoryIcon(notice.category)}
                {notice.category}
              </span>
              <span className="text-sm text-slate-500 font-medium">
                {new Date(notice.posted_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="text-sm text-slate-500 font-medium ml-auto">
                Posted by <span className="font-bold text-slate-700 dark:text-slate-300">{notice.posted_by}</span>
              </span>
            </div>

            <h3 className="text-xl font-bold mb-2 pr-6">{notice.title}</h3>
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
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
