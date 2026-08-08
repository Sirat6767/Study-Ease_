import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertCircle, ShieldAlert } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
  const { isDarkMode } = useTheme();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-up">
      <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200/90 shadow-2xl'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'}`}>
            {type === 'danger' ? <ShieldAlert className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <h3 className={`text-xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        </div>
        <p className={`mb-6 text-sm font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-colors ${isDarkMode ? 'text-slate-400 bg-slate-800 hover:bg-slate-700' : 'text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200'}`}>
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/30' : 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/30'}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
