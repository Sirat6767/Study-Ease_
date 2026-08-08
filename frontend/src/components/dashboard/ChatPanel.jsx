import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import { X, Send, Loader2, MessageCircle, ChevronLeft, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Single conversation view ─────────────────────────────────────────────────
const ChatWindow = ({ batchId, otherUser, currentUserId, onBack, isDarkMode }) => {
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');
  const bottomRef                 = useRef(null);
  const pollRef                   = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/api/chat/${batchId}/${otherUser.userId}`);
      if (res.data.ok) setMessages(res.data.messages);
    } catch (e) {
      setError('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [batchId, otherUser.userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/api/chat/${batchId}`, {
        recipientId: otherUser.userId,
        message: text.trim()
      });
      if (res.data.ok) {
        setMessages(prev => [...prev, res.data.message]);
        setText('');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const inp = `w-full px-4 py-3 rounded-xl border-2 outline-none text-sm transition-all ${
    isDarkMode
      ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-teal-500'
      : 'bg-white border-slate-200 text-slate-800 focus:border-teal-500'
  }`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {otherUser.avatarUrl ? (
          <img src={`${API_URL}${otherUser.avatarUrl}`} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(otherUser.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-bold text-sm">{otherUser.name}</p>
          {otherUser.isCR && <span className="text-xs text-teal-500 font-semibold">Class Representative</span>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center p-8 text-slate-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : messages.map(msg => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isMine
                  ? 'bg-gradient-to-br from-teal-600 to-teal-500 text-white rounded-br-none'
                  : isDarkMode
                    ? 'bg-slate-700 text-slate-100 rounded-bl-none'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
              }`}>
                <p>{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-teal-100' : 'text-slate-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className={`p-4 border-t flex gap-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <input
          className={inp}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
          required
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="p-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-colors shrink-0"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
};

// ── CR Inbox — list of students ───────────────────────────────────────────────
const CRInbox = ({ batchId, onSelectStudent, isDarkMode }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get(`/api/chat/${batchId}/inbox`)
      .then(res => { if (res.data.ok) setStudents(res.data.students); })
      .catch(() => setError('Failed to load student list.'))
      .finally(() => setLoading(false));
  }, [batchId]);

  const row = isDarkMode ? 'list-row-dark' : 'list-row-light';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Batch Students — click to chat
      </p>
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : students.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No students in this batch yet.</p>
      ) : students.map(s => (
        <button
          key={s.userId}
          onClick={() => onSelectStudent(s)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-teal-400 ${row}`}
        >
          {s.avatarUrl ? (
            <img src={`${API_URL}${s.avatarUrl}`} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(s.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{s.name}</p>
            <p className="text-xs text-slate-400 font-mono">{s.regNo}</p>
          </div>
          {s.unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
              {s.unreadCount > 9 ? '9+' : s.unreadCount}
            </span>
          )}
          {!s.hasChat && !s.unreadCount && (
            <MessageCircle className="w-4 h-4 text-slate-300 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
};

// ── ChatPanel — main component ────────────────────────────────────────────────
const ChatPanel = ({ isOpen, onClose, batchId, crUserId, currentUserId, userRole, isCR }) => {
  const { isDarkMode } = useTheme();
  const [selectedUser, setSelectedUser] = useState(null);
  const [crUser, setCrUser] = useState({ userId: 'CR', name: 'Class Representative', isCR: true, avatarUrl: null });

  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
    } else if (!isCR && batchId) {
      api.get(`/api/chat/${batchId}/cr-info`)
        .then(res => {
          if (res.data.ok) {
            setCrUser(prev => ({ ...prev, name: res.data.crName, avatarUrl: res.data.crAvatar }));
          }
        })
        .catch(console.error);
    }
  }, [isOpen, isCR, batchId]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] z-[110] shadow-2xl flex flex-col transition-transform duration-300 ${
        isDarkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-teal-500" />
            <h2 className="text-xl font-bold">
              {isCR ? 'Student Messages' : `Chat with ${crUser.name}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isCR ? (
            selectedUser ? (
              <ChatWindow
                batchId={batchId}
                otherUser={selectedUser}
                currentUserId={currentUserId}
                onBack={() => setSelectedUser(null)}
                isDarkMode={isDarkMode}
              />
            ) : (
              <CRInbox
                batchId={batchId}
                onSelectStudent={setSelectedUser}
                isDarkMode={isDarkMode}
              />
            )
          ) : crUser ? (
            <ChatWindow
              batchId={batchId}
              otherUser={crUser}
              currentUserId={currentUserId}
              onBack={onClose}
              isDarkMode={isDarkMode}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-slate-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No CR assigned to this batch yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
