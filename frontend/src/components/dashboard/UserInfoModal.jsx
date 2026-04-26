import { X, Crown } from 'lucide-react';

/**
 * Shared user info popup — used by AdminPanel (Load Info) and UniversityExplorer (click student).
 * Expects `user` shape:
 *   { id, email, role, created_at,
 *     personal_info: [{ name, father_name, mother_name, contact_no, address }],
 *     academic_info: [{ reg_no, batches: { batch_name, departments: { dept_code, uni_code } } }]
 *   }
 * OR a lightweight user from overview:
 *   { id, email, role, name, batchId }
 */
const ROLE_STYLE = {
  admin:               'bg-red-100    text-red-600',
  cr:                  'bg-teal-100   text-teal-600',
  university_moderator:'bg-violet-100 text-violet-600',
  student:             'bg-slate-200  text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const Row = ({ label, value, mono = false }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`font-semibold text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
};

const Section = ({ title, children, isDarkMode }) => (
  <div className={`p-4 rounded-2xl space-y-2.5 ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
    {children}
  </div>
);

const UserInfoModal = ({ user, isDarkMode, onClose }) => {
  if (!user) return null;

  // Normalize — supports both full (admin getUserInfo) and lightweight (overview user) shapes
  const pi  = user.personal_info?.[0] || {};
  const ai  = user.academic_info?.[0]  || {};
  const name = pi.name || user.name || null;
  const role = user.role;
  const avatar = (name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>

        {/* ── Header ── */}
        <div className={`relative px-8 pt-8 pb-6 ${isDarkMode ? 'bg-gradient-to-br from-indigo-900/60 to-slate-800' : 'bg-gradient-to-br from-indigo-50 to-slate-50'}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
              {avatar}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                {name || <span className="italic text-slate-400">No Name Set</span>}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5 truncate">{user.email}</p>
              <span className={`inline-flex items-center gap-1 mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${ROLE_STYLE[role] || ROLE_STYLE.student}`}>
                {role === 'cr' && <Crown className="w-3 h-3" />}
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Account */}
          <Section title="Account" isDarkMode={isDarkMode}>
            <Row label="Email"  value={user.email} />
            {user.created_at && (
              <Row label="Joined" value={new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
            )}
          </Section>

          {/* Personal Info */}
          <Section title="Personal Info" isDarkMode={isDarkMode}>
            {pi.name || pi.father_name || pi.mother_name || pi.contact_no || pi.address ? (
              <>
                <Row label="Father's Name" value={pi.father_name} />
                <Row label="Mother's Name" value={pi.mother_name} />
                <Row label="Contact"       value={pi.contact_no} />
                <Row label="Address"       value={pi.address} />
                {!pi.father_name && !pi.mother_name && !pi.contact_no && !pi.address && (
                  <p className="text-sm text-slate-400 italic">No details provided.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">No personal info on file.</p>
            )}
          </Section>

          {/* Academic Info */}
          <Section title="Academic Info" isDarkMode={isDarkMode}>
            {ai.reg_no || ai.batches ? (
              <>
                <Row label="Reg No" value={ai.reg_no} mono />
                {ai.batches && (
                  <>
                    <Row label="Batch" value={ai.batches.batch_name} />
                    {ai.batches.departments && (
                      <>
                        <Row label="Dept"       value={ai.batches.departments.dept_code} />
                        <Row label="University" value={ai.batches.departments.uni_code} />
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">No academic info on file.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal;
