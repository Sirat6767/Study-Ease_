import React from 'react';

/**
 * Reusable AcademicBreadcrumb component.
 * Renders hierarchy trail:
 * University > Faculty > Department > Batch
 *
 * Accepts prop `academic` in shape:
 * {
 *   university: { code, name },
 *   faculty:    { code, name },
 *   department: { code, name },
 *   batch:      { name }
 * }
 */
const AcademicBreadcrumb = ({ academic, className = '', isDarkMode = false }) => {
  if (!academic) return null;

  const { university, faculty, department, batch } = academic;

  const uniText  = university?.code || university?.name || null;
  const facText  = faculty?.code    || faculty?.name    || null;
  const deptText = department?.code || department?.name || null;
  const batchText = batch?.name || null;

  const items = [uniText, facText, deptText, batchText].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <nav className={`inline-flex items-center gap-1.5 text-xs font-semibold flex-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} ${className}`}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-slate-400 font-normal">›</span>}
          <span className={`px-2 py-0.5 rounded-md font-bold ${
            idx === items.length - 1
              ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {item}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default AcademicBreadcrumb;
