const API_URL = 'api.php';

let currentUser = null;
let academicInfo = null;
let pendingRequest = null;
let exams = [];
let tasks = [];
let enrollments = [];
let courseFiles = [];
let sharedNotices = [];
let institutions = null; // { universities, departments, batches }

// CR Data
let crRequests = [];

// Theme handling
const THEME_KEY = 'studyease-theme';

async function apiCall(action, body = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
  let data;
  try { data = await res.json(); } catch (_) { throw new Error('Server error'); }
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ============ INIT & THEME ============
function initTheme() {
  let theme = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
}
function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  const t = document.getElementById('themeToggle');
  if (t) t.checked = theme === 'dark';
}
function toggleTheme() {
  const t = document.getElementById('themeToggle');
  const theme = t && t.checked ? 'dark' : 'light';
  applyTheme(theme);
  localStorage.setItem(THEME_KEY, theme);
}

// ============ AUTHENTICATION ============
function fillDemo(role) {
  if (role === 'cr') {
    document.getElementById('loginEmail').value = 'cr@studyease.com';
    document.getElementById('loginPassword').value = '1234';
  } else if (role === 'admin') {
    document.getElementById('loginEmail').value = 'admin@studyease.com';
    document.getElementById('loginPassword').value = '1234';
  } else {
    document.getElementById('loginEmail').value = 'test@test.com';
    document.getElementById('loginPassword').value = '1234';
  }
}

function showRegister() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.remove('hidden');
}
function showLogin() {
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  try {
    await apiCall('login', { email, password: pass });
    await loadBootstrap();
  } catch (e) { await uiAlert(e.message); }
}

async function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value;
  try {
    await apiCall('register', { name, email, password: pass });
    await uiAlert('Account created! Please sign in.');
    showLogin();
  } catch (e) { await uiAlert(e.message); }
}

async function logout() {
  try { await apiCall('logout'); } catch (_) {}
  location.reload();
}

async function loadBootstrap() {
  try {
    const data = await apiCall('bootstrap');
    currentUser = data.user;
    academicInfo = data.academic;
    pendingRequest = data.pendingRequest;
    exams = data.exams || [];
    tasks = data.tasks || [];
    enrollments = data.enrollments || [];
    courseFiles = data.courseFiles || [];
    sharedNotices = data.notices || [];

    document.getElementById('loginPage').classList.add('hidden');
    
    if (!academicInfo && currentUser.role !== 'admin' && currentUser.role !== 'university_moderator') {
      document.getElementById('dashboardPage').classList.add('hidden');
      document.getElementById('limboPage').classList.remove('hidden');
      document.getElementById('limboUserName').textContent = currentUser.name;
      if (pendingRequest) {
        document.getElementById('limboJoinForm').classList.add('hidden');
        document.getElementById('limboPendingMsg').classList.remove('hidden');
        document.getElementById('limboPendingBatch').textContent = pendingRequest.batchId;
      } else {
        await loadLimboInstitutions();
      }
    } else {
      document.getElementById('limboPage').classList.add('hidden');
      document.getElementById('dashboardPage').classList.remove('hidden');
      setupDashboard();
    }
  } catch (e) { 
    // Not logged in
    document.getElementById('loginPage').classList.remove('hidden');
  }
}

// ============ LIMBO (JOIN BATCH) ============
async function loadLimboInstitutions() {
  try {
    institutions = await apiCall('institutions_list');
    const uniSel = document.getElementById('limboUni');
    uniSel.innerHTML = '<option value="">Select University</option>' + 
      institutions.universities.map(u => `<option value="${u.uni_code}">${u.uni_name}</option>`).join('');
  } catch (e) { await uiAlert("Failed to load institutions"); }
}

function limboPopulateDepts() {
  const uniCode = document.getElementById('limboUni').value;
  const deptSel = document.getElementById('limboDept');
  deptSel.innerHTML = '<option value="">Select Department</option>' + 
    institutions.departments.filter(d => d.uni_code === uniCode).map(d => `<option value="${d.dept_id}">${d.dept_name}</option>`).join('');
  limboPopulateBatches();
}

function limboPopulateBatches() {
  const deptId = parseInt(document.getElementById('limboDept').value);
  const batchSel = document.getElementById('limboBatch');
  batchSel.innerHTML = '<option value="">Select Batch</option>' + 
    institutions.batches.filter(b => parseInt(b.dept_id) === deptId).map(b => `<option value="${b.batch_id}">${b.batch_name}</option>`).join('');
}

async function submitJoinRequest() {
  const batchId = parseInt(document.getElementById('limboBatch').value);
  const regNo = document.getElementById('limboRegNo').value.trim();
  if (!batchId || !regNo) return await uiAlert("Select a batch and enter your registration number");
  try {
    await apiCall('batch_join_request', { batchId, regNo });
    await loadBootstrap(); // Reload state
  } catch (e) { await uiAlert(e.message); }
}

// ============ CUSTOM MODALS ============
function uiConfirm(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--surface);padding:2rem;border-radius:var(--radius);max-width:400px;width:90%;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.3);';
        box.innerHTML = `<h3 style="margin-bottom:1rem;">Confirm Action</h3><p style="margin-bottom:1.5rem;text-align:left;line-height:1.5;">${(message||"").replace(/\n/g, '<br>')}</p>
        <div style="display:flex;gap:1rem;justify-content:center;">
            <button class="btn btn-secondary" id="ucCancel">Cancel</button>
            <button class="btn btn-danger" id="ucOk">Yes, Proceed</button>
        </div>`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        document.getElementById('ucCancel').onclick = () => { overlay.remove(); resolve(false); };
        document.getElementById('ucOk').onclick = () => { overlay.remove(); resolve(true); };
    });
}

function uiPrompt(message, defaultVal = '') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--surface);padding:2rem;border-radius:var(--radius);max-width:400px;width:90%;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.3);';
        box.innerHTML = `<h3 style="margin-bottom:1rem;">Input Required</h3><p style="margin-bottom:1rem;text-align:left;">${message}</p>
        <input type="text" id="upInput" class="input-wrapper" value="${defaultVal}" style="width:100%;box-sizing:border-box;margin-bottom:1.5rem;padding:0.8rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text);">
        <div style="display:flex;gap:1rem;justify-content:flex-end;">
            <button class="btn btn-secondary" id="upCancel">Cancel</button>
            <button class="btn" id="upOk">OK</button>
        </div>`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        const input = document.getElementById('upInput');
        input.focus();
        if(defaultVal) input.select();
        
        document.getElementById('upCancel').onclick = () => { overlay.remove(); resolve(null); };
        document.getElementById('upOk').onclick = () => { overlay.remove(); resolve(input.value); };
        input.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('upOk').click(); if(e.key === 'Escape') document.getElementById('upCancel').click(); };
    });
}

function uiAlert(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--surface);padding:2rem;border-radius:var(--radius);max-width:400px;width:90%;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.3);';
        box.innerHTML = `<h3 style="margin-bottom:1rem;">Notification</h3><p style="margin-bottom:1.5rem;text-align:left;line-height:1.5;">${(message||"").replace(/\n/g, '<br>')}</p>
        <div style="display:flex;justify-content:center;">
            <button class="btn" id="uaOk">OK</button>
        </div>`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        document.getElementById('uaOk').onclick = () => { overlay.remove(); resolve(); };
        document.getElementById('uaOk').focus();
    });
}

function uiRoleAssignModal(userName, role) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--surface);padding:2rem;border-radius:var(--radius);max-width:450px;width:95%;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.3);';
        
        let fieldsHtml = '';
        if (role === 'university_moderator') {
            fieldsHtml = `
                <p style="margin-bottom:1rem;text-align:left;">Select University for <strong>${userName}</strong>:</p>
                <select id="uraUni" class="input-wrapper" style="width:100%;margin-bottom:1.5rem;padding:0.8rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text);">
                    ${adminData.universities.map(u => `<option value="${u.uni_code}">${u.uni_name}</option>`).join('')}
                </select>`;
        } else if (role === 'cr') {
            fieldsHtml = `
                <p style="margin-bottom:1rem;text-align:left;">Select Batch for <strong>${userName}</strong>:</p>
                <select id="uraBatch" class="input-wrapper" style="width:100%;margin-bottom:1.5rem;padding:0.8rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text);">
                    ${adminData.batches.map(b => {
                        const dept = adminData.departments.find(d => d.dept_id === b.dept_id);
                        const uni = adminData.universities.find(u => u.uni_code === (dept?dept.uni_code:''));
                        return `<option value="${b.batch_id}">${uni ? uni.uni_name : ''} - ${dept ? dept.dept_name : ''} - ${b.batch_name}</option>`;
                    }).join('')}
                </select>
                <p style="font-size:0.8rem;color:var(--text-dim);margin-top:-1rem;margin-bottom:1.5rem;text-align:left;">⚠️ The current CR of this batch will be demoted to Student.</p>`;
        }

        box.innerHTML = `
            <h3 style="margin-bottom:1.5rem;">Role Configuration</h3>
            ${fieldsHtml}
            <div style="display:flex;gap:1rem;justify-content:center;">
                <button class="btn btn-secondary" id="uraCancel">Cancel</button>
                <button class="btn" id="uraOk">Confirm & Assign</button>
            </div>`;
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        document.getElementById('uraCancel').onclick = () => { overlay.remove(); resolve(null); };
        document.getElementById('uraOk').onclick = () => {
            const data = {};
            if (role === 'university_moderator') data.uniCode = document.getElementById('uraUni').value;
            if (role === 'cr') data.batchId = document.getElementById('uraBatch').value;
            overlay.remove();
            resolve(data);
        };
    });
}

// ============ DASHBOARD INIT ============
function setupDashboard() {
  // Header
  document.getElementById('ahName').textContent = currentUser.name;
  if (academicInfo) {
      document.getElementById('ahReg').textContent = 'Reg: ' + academicInfo.regNo;
      document.getElementById('ahBatch').textContent = academicInfo.batchName;
      document.getElementById('ahUni').textContent = `Dept of ${academicInfo.deptCode} | ${academicInfo.uniCode}`;
  } else {
      document.getElementById('ahReg').textContent = currentUser.role.toUpperCase();
      document.getElementById('ahBatch').textContent = currentUser.role === 'admin' ? 'System Administration' : 'University Moderation';
      document.getElementById('ahUni').textContent = 'Global Access';
  }

  // Role UI
  const isCR = currentUser.role === 'cr';
  const isAdmin = currentUser.role === 'admin';
  document.getElementById('dashboardPage').classList.toggle('cr-mode', isCR || isAdmin);
  
  const badge = document.getElementById('crNavBadge');
  if (isCR || isAdmin) {
    badge.classList.remove('hidden');
    badge.textContent = isCR ? '👑 Class Representative' : '🛠️ Administrator';
  } else {
    badge.classList.add('hidden');
  }

  document.getElementById('crTabBtn').classList.toggle('hidden', !isCR);
  document.getElementById('adminTabBtn').classList.toggle('hidden', !isAdmin);

  if (isAdmin) {
      document.getElementById('overviewTabBtn').classList.add('hidden');
      document.getElementById('coursesTabBtn').classList.add('hidden');
      document.getElementById('noticeTabBtn').classList.add('hidden');
      loadAdminData();
      showTab('admin', document.getElementById('adminTabBtn'));
  } else {
      document.getElementById('overviewTabBtn').classList.remove('hidden');
      document.getElementById('coursesTabBtn').classList.remove('hidden');
      document.getElementById('noticeTabBtn').classList.remove('hidden');
      renderExams();
      renderTasks();
      renderCourses();
      renderNotices();
      if (isCR) loadCRData();
  }
}

function showTab(tabId, btn) {
  ['overview', 'courses', 'notices', 'crpanel', 'admin'].forEach(t => document.getElementById(t+'Tab').classList.add('hidden'));
  document.getElementById(tabId+'Tab').classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ============ EXAMS ============
function renderExams() {
  const el = document.getElementById('examsList');
  if (exams.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No exams scheduled by CR</p></div>`;
    return;
  }
  el.innerHTML = exams.map(e => `
    <div class="item">
      <div class="item-content">
        <strong>${e.name} (${e.courseCode})</strong>
        <p>📆 ${e.date} ${e.time ? '@ ' + e.time : ''} | 📍 ${e.venue || 'TBA'}</p>
        ${e.notes ? `<p><small>${e.notes}</small></p>` : ''}
      </div>
    </div>
  `).join('');
}

// ============ TASKS ============
function showAddTask() { document.getElementById('addTaskForm').classList.remove('hidden'); }
function hideAddTask() { document.getElementById('addTaskForm').classList.add('hidden'); document.getElementById('taskName').value = ''; }

async function addTask() {
  const name = document.getElementById('taskName').value.trim();
  if (!name) return;
  try {
    const res = await apiCall('task_add', { name });
    tasks.push(res.task);
    hideAddTask();
    renderTasks();
  } catch (e) { await uiAlert(e.message); }
}

async function toggleTask(id) {
  try {
    const res = await apiCall('task_toggle', { id });
    const t = tasks.find(x => x.id === id);
    if (t) t.done = res.done;
    renderTasks();
  } catch (e) { await uiAlert(e.message); }
}

async function deleteTask(id) {
  if (!(await uiConfirm("Delete task?"))) return;
  try {
    await apiCall('task_delete', { id });
    tasks = tasks.filter(x => x.id !== id);
    renderTasks();
  } catch (e) { await uiAlert(e.message); }
}

function renderTasks() {
  const el = document.getElementById('tasksList');
  if (tasks.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No tasks yet</p></div>`;
    return;
  }
  el.innerHTML = tasks.map(t => `
    <div class="item">
      <div class="item-content" style="display:flex; align-items:center; gap:10px;">
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${t.id})">
        <strong style="${t.done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${t.name}</strong>
      </div>
      <button class="btn btn-icon btn-delete" onclick="deleteTask(${t.id})">🗑️</button>
    </div>
  `).join('');
}

// ============ COURSES & GRADES ============
function cgpaToGPA(pct) {
    if (pct >= 80) return 4.0;
    if (pct >= 75) return 3.75;
    if (pct >= 70) return 3.5;
    if (pct >= 65) return 3.25;
    if (pct >= 60) return 3.0;
    if (pct >= 55) return 2.75;
    if (pct >= 50) return 2.5;
    if (pct >= 45) return 2.25;
    if (pct >= 40) return 2.0;
    return 0.0;
}

function renderCourses() {
  const el = document.getElementById('coursesList');
  if (enrollments.length === 0) {
    el.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p>No courses active in your batch yet.</p></div>`;
    return;
  }

  let totalPoints = 0;
  let totalCredits = 0;

  el.innerHTML = enrollments.map(en => {
    const totalMax = en.components.reduce((s, c) => s + c.maxMarks, 0);
    const totalObtained = en.components.reduce((s, c) => s + c.obtained, 0);
    const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const gpa = cgpaToGPA(pct);
    
    if (totalMax > 0) {
        totalPoints += (gpa * en.creditHours);
        totalCredits += en.creditHours;
    }

    const files = courseFiles.filter(f => f.courseId === en.courseId);

    return `
    <div class="card" style="margin-bottom: 1rem;">
      <div class="card-header">
        <div>
          <h3 style="margin:0;">${en.title}</h3>
          <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">${en.code} • ${en.creditHours} Credits</p>
        </div>
        <div style="text-align:right;">
          <h3 style="margin:0; color:var(--primary);">${gpa.toFixed(2)} GPA</h3>
          <p style="margin:0; font-size:0.9rem;">${totalObtained}/${totalMax} (${pct.toFixed(1)}%)</p>
        </div>
      </div>
      
      <div style="padding: 1rem; border-top: 1px solid var(--border);">
        <h4 style="margin-bottom:0.5rem; font-size:0.9rem; text-transform:uppercase;">Grade Components</h4>
        ${en.components.length === 0 ? '<p style="font-size:0.9rem; color:var(--text-muted);">No marks added yet.</p>' : ''}
        ${en.components.map(c => `
          <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem;">
            <span>${c.name} (${c.type})</span>
            <span>
                <strong>${c.obtained}</strong> / ${c.maxMarks}
                <button class="btn btn-icon btn-delete" style="padding:2px; font-size:0.8rem; height:auto; width:auto; margin-left:5px;" onclick="deleteComponent(${c.id}, ${en.enrollId})">🗑️</button>
            </span>
          </div>
        `).join('')}
        
        <div style="margin-top:10px; display:flex; gap:10px;">
          <input type="text" id="compName_${en.enrollId}" placeholder="e.g. Midterm" style="flex:2; padding:5px;">
          <input type="number" id="compMax_${en.enrollId}" placeholder="Max" style="flex:1; padding:5px;">
          <input type="number" id="compGot_${en.enrollId}" placeholder="Got" style="flex:1; padding:5px;">
          <button class="btn btn-small" onclick="addComponent(${en.enrollId}, ${en.courseId})">+</button>
        </div>
      </div>

      ${files.length > 0 ? `
      <div style="padding: 1rem; border-top: 1px solid var(--border); background: var(--surface-2);">
        <h4 style="margin-bottom:0.5rem; font-size:0.9rem; text-transform:uppercase;">Course Resources</h4>
        ${files.map(f => `
            <a href="${f.url}" target="_blank" style="display:block; padding:8px; background:var(--surface); border-radius:var(--radius); text-decoration:none; color:var(--text); margin-bottom:5px;">
                📄 ${f.name} <span style="float:right; font-size:0.8rem; color:var(--text-muted);">${f.type}</span>
            </a>
        `).join('')}
      </div>
      ` : ''}
    </div>
    `;
  }).join('');

  const overall = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  document.getElementById('overallCgpa').textContent = overall;
}

async function addComponent(enrollId, courseId) {
  const name = document.getElementById(`compName_${enrollId}`).value.trim();
  const max = parseFloat(document.getElementById(`compMax_${enrollId}`).value);
  const got = parseFloat(document.getElementById(`compGot_${enrollId}`).value);
  if (!name || isNaN(max) || isNaN(got)) return await uiAlert("Fill all fields");
  try {
    const res = await apiCall('component_add', { enrollmentId: enrollId, courseId, name, maxMarks: max, obtained: got });
    const en = enrollments.find(e => e.enrollId === enrollId);
    if (en) en.components.push(res.component);
    renderCourses();
  } catch (e) { await uiAlert(e.message); }
}

async function deleteComponent(id, enrollId) {
  if (!(await uiConfirm("Delete component?"))) return;
  try {
    await apiCall('component_delete', { componentId: id, enrollmentId: enrollId });
    const en = enrollments.find(e => e.enrollId === enrollId);
    if (en) en.components = en.components.filter(c => c.id !== id);
    renderCourses();
  } catch (e) { await uiAlert(e.message); }
}

// ============ NOTICES ============
function renderNotices() {
  const el = document.getElementById('noticesList');
  if (sharedNotices.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No notices yet</p></div>`;
    return;
  }
  el.innerHTML = sharedNotices.map(n => `
    <div class="item priority-${n.priority}">
      <div class="item-content">
        <strong>${n.title} ${n.isPinned ? '📌' : ''}</strong>
        <p style="margin: 5px 0;">${n.description}</p>
        <p style="font-size:0.8rem; color:var(--text-muted);">
            Posted by ${n.postedBy} • ${new Date(n.postedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  `).join('');
}

// ============ CR DASHBOARD LOGIC ============
async function loadCRData() {
  try {
    const reqs = await apiCall('cr_requests_list');
    crRequests = reqs.requests;
    renderCRRequests();
    renderCRNotices();
    renderCRCourses();
  } catch (e) { console.error("Failed to load CR data", e); }
}

function renderCRRequests() {
  const el = document.getElementById('crRequestsList');
  if (crRequests.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">No pending requests.</p>';
    return;
  }
  el.innerHTML = crRequests.map(r => `
    <div class="item" style="border-left: 3px solid var(--warning);">
      <div class="item-content">
        <strong>${r.name} (${r.regNo})</strong>
        <p>${r.email}</p>
        ${r.message ? `<p style="font-style:italic;">"${r.message}"</p>` : ''}
      </div>
      <div>
        <button class="btn btn-small" style="background:var(--success);" onclick="reviewRequest(${r.id}, 'approved')">Approve</button>
        <button class="btn btn-small btn-danger" onclick="reviewRequest(${r.id}, 'rejected')">Reject</button>
      </div>
    </div>
  `).join('');
}

async function reviewRequest(id, status) {
  if (!(await uiConfirm(`Are you sure you want to ${status} this request?`))) return;
  try {
    await apiCall('cr_request_review', { requestId: id, status });
    crRequests = crRequests.filter(r => r.id !== id);
    renderCRRequests();
  } catch (e) { await uiAlert(e.message); }
}

function showCRAddForm() { document.getElementById('crAddNoticeForm').classList.remove('hidden'); }
function hideCRAddForm() { document.getElementById('crAddNoticeForm').classList.add('hidden'); }

async function addNotice() {
  const title = document.getElementById('noticeTitle').value.trim();
  const desc = document.getElementById('noticeDesc').value.trim();
  const cat = document.getElementById('noticeCategory').value;
  const pri = document.getElementById('noticePriority').value;
  if (!title || !desc) return await uiAlert("Title and description required");
  try {
    await apiCall('notice_add', { title, description: desc, category: cat, priority: pri });
    hideCRAddForm();
    await loadBootstrap(); // Reload notices
  } catch (e) { await uiAlert(e.message); }
}

function renderCRNotices() {
    const el = document.getElementById('crNoticesList');
    if (sharedNotices.length === 0) return el.innerHTML = '';
    el.innerHTML = sharedNotices.map(n => `
        <div class="item">
            <div class="item-content"><strong>${n.title}</strong><p>${n.description}</p></div>
            <button class="btn btn-icon btn-delete" onclick="deleteNotice(${n.id})">🗑️</button>
        </div>
    `).join('');
}

async function deleteNotice(id) {
    if (!(await uiConfirm("Delete notice?"))) return;
    try {
        await apiCall('notice_delete', { id });
        await loadBootstrap();
    } catch(e) { await uiAlert(e.message); }
}

async function crAddCourse() {
    const code = document.getElementById('crCourseCode').value.trim();
    const name = document.getElementById('crCourseName').value.trim();
    const cred = document.getElementById('crCourseCredits').value;
    if (!code || !name) return await uiAlert("Code and name required");
    try {
        await apiCall('cr_course_add', { courseCode: code, courseName: name, creditHours: parseFloat(cred) });
        document.getElementById('crAddCourseForm').classList.add('hidden');
        await loadBootstrap();
        loadCRData();
    } catch(e) { await uiAlert(e.message); }
}

function renderCRCourses() {
    const courseSel = document.getElementById('crExamCourseId');
    courseSel.innerHTML = enrollments.map(e => `<option value="${e.courseId}">${e.title} (${e.code})</option>`).join('');
    
    const el = document.getElementById('crCoursesList');
    el.innerHTML = enrollments.map(e => `
        <div class="item">
            <div class="item-content">
                <strong>${e.title} (${e.code})</strong>
            </div>
            <div>
                <button class="btn btn-small" onclick="promptUploadFile(${e.courseId})">Upload File</button>
            </div>
        </div>
    `).join('');
}

async function crAddExam() {
    const courseId = document.getElementById('crExamCourseId').value;
    const name = document.getElementById('crExamName').value.trim();
    const date = document.getElementById('crExamDate').value;
    const time = document.getElementById('crExamTime').value;
    const venue = document.getElementById('crExamVenue').value;
    
    if (!courseId || !name || !date) return await uiAlert("Course, name and date required");
    try {
        await apiCall('cr_exam_add', { courseId, name, date, time, venue });
        document.getElementById('crAddExamForm').classList.add('hidden');
        await loadBootstrap();
    } catch(e) { await uiAlert(e.message); }
}

async function promptUploadFile(courseId) {
    const url = await uiPrompt("Enter file URL (e.g. Google Drive link):");
    if (!url) return;
    const name = await uiPrompt("Enter file name (e.g. Lecture 1 Slides):");
    if (!name) return;
    const type = await uiPrompt("Type (lecture, assignment, past_paper, resource):", "lecture") || "other";
    
    try {
        await apiCall('cr_file_upload', { courseId, fileUrl: url, fileName: name, fileType: type });
        await loadBootstrap();
    } catch(e) { await uiAlert(e.message); }
}

// Boot up
window.onload = () => {
  initTheme();
  loadBootstrap();
};

// ============ ADMIN DASHBOARD LOGIC ============
let adminData = null;
let adminInstState = { level: 'uni', uniCode: null, deptId: null, batchId: null };

async function loadAdminData() {
  try {
    adminData = await apiCall('admin_overview');
    renderAdminOverview();
  } catch(e) { console.error("Admin load failed", e); }
}

function renderAdminOverview(subTab = 'stats') {
    if (!adminData) return;
    const el = document.getElementById('adminTab');
    
    const nav = `
      <div style="margin-bottom:1rem; display:flex; gap:10px; overflow-x:auto;">
         <button class="btn ${subTab==='stats'?'':'btn-secondary'}" onclick="renderAdminOverview('stats')">Stats</button>
         <button class="btn ${subTab==='users'?'':'btn-secondary'}" onclick="renderAdminOverview('users')">Users</button>
         <button class="btn ${subTab==='institutions'?'':'btn-secondary'}" onclick="renderAdminOverview('institutions')">Institutions</button>
         <button class="btn ${subTab==='notices'?'':'btn-secondary'}" onclick="renderAdminOverview('notices')">Global Notices</button>
      </div>
    `;
    
    let content = '';
    if (subTab === 'stats') content = buildAdminStats();
    if (subTab === 'users') content = buildAdminUsers();
    if (subTab === 'institutions') content = buildAdminInstitutions();
    if (subTab === 'notices') content = buildAdminNotices();

    el.innerHTML = nav + content;
}

function buildAdminStats() {
    return `
      <div class="grid">
        <div class="card">
          <div class="card-header"><h2>📊 System Stats</h2></div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
            <div style="padding:15px; background:var(--surface-2); border-radius:var(--radius); text-align:center;">
              <h1 style="color:var(--primary);">${adminData.users.length}</h1>
              <p style="color:var(--text-muted); font-size:0.9rem;">Total Users</p>
            </div>
            <div style="padding:15px; background:var(--surface-2); border-radius:var(--radius); text-align:center; cursor:pointer;" onclick="renderAdminOverview('institutions')">
              <h1 style="color:var(--primary);">${adminData.universities.length}</h1>
              <p style="color:var(--text-muted); font-size:0.9rem;">Universities</p>
            </div>
          </div>
        </div>
      </div>
    `;
}

function buildAdminUsers() {
    setTimeout(filterAdminUsers, 0);
    return `
      <div class="card">
        <div class="card-header"><h2>👥 Manage Users</h2></div>
        <input type="text" id="adminUserSearch" onkeyup="filterAdminUsers()" placeholder="Search by name or email..." style="margin-top:10px; width:100%;">
        <div id="adminUsersList" style="max-height: 500px; overflow-y:auto; margin-top:10px;"></div>
      </div>
    `;
}

function filterAdminUsers() {
    const q = document.getElementById('adminUserSearch')?.value.toLowerCase() || '';
    const list = document.getElementById('adminUsersList');
    if(!list) return;
    
    const filtered = adminData.users.filter(u => (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    
    list.innerHTML = filtered.map(u => `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="cursor:pointer;" onclick="document.getElementById('ud-${u.id}').classList.toggle('hidden')">
                <strong>${u.name || 'No Name'}</strong>
                <p style="font-size:0.85rem; color:var(--text-muted);">${u.email} &nbsp;·&nbsp; <em>${u.role}</em></p>
              </div>
              <div style="display:flex; gap:10px; align-items:center;">
                  <select id="roleSelect-${u.id}" onchange="adminChangeRole(${u.id}, this.value, '${u.role}', '${(u.name||'').replace(/'/g,'')}')" style="padding:5px; border-radius:var(--radius);">
                      <option value="student" ${u.role==='student'?'selected':''}>Student</option>
                      <option value="cr" ${u.role==='cr'?'selected':''}>CR</option>
                      <option value="university_moderator" ${u.role==='university_moderator'?'selected':''}>Moderator</option>
                      <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                  </select>
                  <button class="btn btn-small btn-danger" onclick="adminDeleteUser(${u.id})">Delete</button>
              </div>
          </div>
          <div id="ud-${u.id}" class="hidden" style="margin-top:10px; padding:10px; background:var(--surface-2); border-radius:var(--radius); font-size:0.9rem;">
             <p><strong>Created:</strong> ${new Date(u.createdAt).toLocaleString()}</p>
             <p><strong>Status:</strong> ${u.isActive ? 'Active' : 'Disabled'}</p>
             <div id="ud-acad-${u.id}">
                <button class="btn btn-small" onclick="adminFetchUserDetails(${u.id})">Load Full Info</button>
             </div>
          </div>
        </div>
    `).join('');
}

async function adminFetchUserDetails(userId) {
    try {
        const data = await apiCall('admin_user_details', { userId });
        const div = document.getElementById('ud-acad-' + userId);
        let html = '<hr>';
        if (data.personal) {
            html += `<p style="font-weight:600; margin-bottom:4px;">👤 Personal</p>`;
            html += `<p><strong>Name:</strong> ${data.personal.name || '—'}</p>`;
            if (data.personal.father_name) html += `<p><strong>Father:</strong> ${data.personal.father_name}</p>`;
            if (data.personal.mother_name) html += `<p><strong>Mother:</strong> ${data.personal.mother_name}</p>`;
            if (data.personal.contact_no)  html += `<p><strong>Contact:</strong> ${data.personal.contact_no}</p>`;
            if (data.personal.address)     html += `<p><strong>Address:</strong> ${data.personal.address}</p>`;
        } else {
            html += '<p>No personal info on file.</p>';
        }
        html += '<hr>';
        if (data.academic) {
            html += `<p style="font-weight:600; margin-bottom:4px;">🎓 Academic</p>`;
            html += `<p><strong>Reg No:</strong> ${data.academic.reg_no}</p>`;
            html += `<p><strong>Batch:</strong> ${data.academic.batch_name}</p>`;
            html += `<p><strong>Dept:</strong> ${data.academic.dept_name} (${data.academic.dept_code})</p>`;
            html += `<p><strong>Uni:</strong> ${data.academic.uni_name} (${data.academic.uni_code})</p>`;
        } else {
            html += '<p>No academic info (user not in any batch).</p>';
        }
        div.innerHTML = html;
    } catch(e) { await uiAlert(e.message); }
}

function buildAdminInstitutions() {
    adminInstState = { level: 'uni', uniCode: null, deptId: null, deptCode: null, batchId: null, batchName: null };
    setTimeout(renderAdminInstView, 0);
    return `<div id="adminInstContainer"></div>`;
}

function renderAdminInstView() {
    const c = document.getElementById('adminInstContainer');
    if(!c) return;
    
    if (adminInstState.level === 'uni') {
        c.innerHTML = `
          <div class="card">
            <div class="card-header"><h2>🏛️ Universities</h2></div>
            <div style="display:flex; gap:10px; margin-top:10px; margin-bottom:10px;">
                <input type="text" id="addUniCode" placeholder="Code (e.g. SSTU)">
                <input type="text" id="addUniName" placeholder="Name">
                <button class="btn btn-small" onclick="adminAddUni()">Add</button>
            </div>
            ${adminData.universities.map(u => `
              <div class="item" style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="cursor:pointer; flex:1;" onclick="adminInstState.level='dept'; adminInstState.uniCode='${u.uni_code}'; renderAdminInstView();">
                      <strong>${u.uni_code}</strong>: ${u.uni_name}
                  </div>
                  <div>
                      <button class="btn btn-icon" onclick="adminEditUni('${u.uni_code}')">✏️</button>
                      <button class="btn btn-icon btn-danger" onclick="adminDelUni('${u.uni_code}')">🗑️</button>
                  </div>
              </div>
            `).join('')}
          </div>
        `;
    } else if (adminInstState.level === 'dept') {
        const depts = adminData.departments.filter(d => d.uni_code === adminInstState.uniCode);
        const _uniName1 = adminData.universities.find(u => u.uni_code === adminInstState.uniCode)?.uni_name || adminInstState.uniCode;
        const _crumb1 = `<nav style="font-size:0.85rem;margin-bottom:10px;color:var(--text-muted);"><span style="cursor:pointer;color:var(--primary);" onclick="adminInstState.level='uni';renderAdminInstView();">🏛️ All Universities</span> › <strong>${_uniName1}</strong></nav>`;
        c.innerHTML = _crumb1 + `
          <div class="card">
            <div class="card-header"><h2>🏢 Departments — ${_uniName1}</h2></div>
            <div style="display:flex; gap:10px; margin-top:10px; margin-bottom:10px;">
                <input type="text" id="addDeptCode" placeholder="Code (e.g. CSE)">
                <input type="text" id="addDeptName" placeholder="Name">
                <button class="btn btn-small" onclick="adminAddDept('${adminInstState.uniCode}')">Add Dept</button>
            </div>
            ${depts.map(d => `
              <div class="item" style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="cursor:pointer; flex:1;" onclick="adminInstState.level='batch'; adminInstState.deptId=${d.dept_id}; renderAdminInstView();">
                      <strong>${d.dept_code}</strong>: ${d.dept_name}
                  </div>
                  <div>
                      <button class="btn btn-icon" onclick="adminEditDept(${d.dept_id})">✏️</button>
                      <button class="btn btn-icon btn-danger" onclick="adminDelDept(${d.dept_id})">🗑️</button>
                  </div>
              </div>
            `).join('')}
          </div>
        `;
    } else if (adminInstState.level === 'batch') {
        const batches = adminData.batches.filter(b => b.dept_id === adminInstState.deptId);
        const _uniName2 = adminData.universities.find(u => u.uni_code === adminInstState.uniCode)?.uni_name || adminInstState.uniCode;
        const _deptName2 = adminData.departments.find(d => d.dept_id === adminInstState.deptId)?.dept_name || '';
        const _crumb2 = `<nav style="font-size:0.85rem;margin-bottom:10px;color:var(--text-muted);"><span style="cursor:pointer;color:var(--primary);" onclick="adminInstState.level='uni';renderAdminInstView();">🏛️ All Universities</span> › <span style="cursor:pointer;color:var(--primary);" onclick="adminInstState.level='dept';renderAdminInstView();">${_uniName2}</span> › <strong>${_deptName2}</strong></nav>`;
        c.innerHTML = _crumb2 + `
          <div class="card">
            <div class="card-header"><h2>🎓 Batches — ${_deptName2}</h2></div>
            <div style="display:flex; gap:10px; margin-top:10px; margin-bottom:10px;">
                <input type="text" id="addBatchName" placeholder="Batch Name (e.g. CSE-2024)">
                <button class="btn btn-small" onclick="adminAddBatch(${adminInstState.deptId})">Add Batch</button>
            </div>
            ${batches.map(b => `
              <div class="item" style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="cursor:pointer; flex:1;" onclick="adminInstState.level='course'; adminInstState.batchId=${b.batch_id}; adminInstState.batchName='${b.batch_name}'; renderAdminInstView();">
                      <strong>${b.batch_name}</strong> (CR: ${b.crName || 'None'})
                  </div>
                  <div>
                      <button class="btn btn-icon" onclick="adminEditBatch(${b.batch_id})">✏️</button>
                      <button class="btn btn-icon btn-danger" onclick="adminDelBatch(${b.batch_id})">🗑️</button>
                  </div>
              </div>
            `).join('')}
          </div>
        `;
    } else if (adminInstState.level === 'course') {
        const courses = adminData.courses.filter(co2 => co2.batch_id === adminInstState.batchId);
        const _uniName3 = adminData.universities.find(u => u.uni_code === adminInstState.uniCode)?.uni_name || adminInstState.uniCode;
        const _deptName3 = adminData.departments.find(d => d.dept_id === adminInstState.deptId)?.dept_name || '';
        const _crumb3 = `<nav style="font-size:0.85rem;margin-bottom:10px;color:var(--text-muted);"><span style="cursor:pointer;color:var(--primary);" onclick="adminInstState.level='uni';renderAdminInstView();">🏛️ All Universities</span> › <span style="cursor:pointer;color:var(--primary);" onclick="adminInstState.level='dept';renderAdminInstView();">${_uniName3}</span> › <span style="cursor:pointer;color:var(--primary);" onclick="adminInstState.level='batch';renderAdminInstView();">${_deptName3}</span> › <strong>${adminInstState.batchName||'Batch'}</strong></nav>`;
        c.innerHTML = _crumb3 + `
          <div class="card">
            <div class="card-header"><h2>📚 Courses — ${adminInstState.batchName||'Batch'}</h2></div>
            <div style="display:flex; gap:10px; margin-top:10px; margin-bottom:10px;">
                <input type="text" id="addCourseCode" placeholder="Code (CSE101)">
                <input type="text" id="addCourseName" placeholder="Name">
                <input type="number" id="addCourseCredits" placeholder="Cr" value="3.0" step="0.5" style="width:70px;">
                <button class="btn btn-small" onclick="adminAddCourse(${adminInstState.batchId})">Add Course</button>
            </div>
            ${courses.map(co => `
              <div class="item" style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                      <strong>${co.course_code}</strong>: ${co.course_name} (${co.credit_hours} Cr)
                  </div>
                  <div>
                      <button class="btn btn-icon" onclick="adminEditCourse(${co.course_id})">✏️</button>
                      <button class="btn btn-icon btn-danger" onclick="adminDelCourse(${co.course_id})">🗑️</button>
                  </div>
              </div>
            `).join('')}
          </div>
        `;
    }
}

function buildAdminNotices() {
    return `
      <div class="card">
        <div class="card-header"><h2>📢 Global Notice Board</h2></div>
        <div style="max-height: 500px; overflow-y:auto; margin-top:10px;">
          ${adminData.notices.map(n => `
            <div class="item priority-${n.priority}">
              <div class="item-content" style="flex:1;">
                <strong>${n.title} ${n.isPinned ? '📌' : ''}</strong>
                <p style="margin: 5px 0;">${n.description}</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">
                    By <em>${n.postedBy}</em>
                    &nbsp;·&nbsp;
                    ${n.uniName ? `🏛️ ${n.uniName}` : ''}
                    ${n.batchName ? `&nbsp;›&nbsp; ${n.batchName}` : ''}
                </p>
              </div>
              <button class="btn btn-icon btn-danger" onclick="adminDeleteNotice(${n.id})">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
}

// Admin API calls
async function adminChangeRole(userId, role, oldRole, userName) {
    let payload = { userId, role };
    
    // 1. If special role, show selection modal
    if (role === 'cr' || role === 'university_moderator') {
        const extra = await uiRoleAssignModal(userName, role);
        if (!extra) {
            // Revert dropdown
            const sel = document.getElementById('roleSelect-' + userId);
            if (sel) sel.value = oldRole;
            return;
        }
        payload = { ...payload, ...extra };
    } else {
        // 2. Otherwise just confirm
        if (!(await uiConfirm(`Change ${userName}'s role from "${oldRole}" to "${role}"?`))) {
            const sel = document.getElementById('roleSelect-' + userId);
            if (sel) sel.value = oldRole;
            return;
        }
    }

    try { 
        await apiCall('admin_user_role_update', payload); 
        await loadAdminData(); 
        renderAdminOverview('users'); 
    } catch(e) { 
        await uiAlert('Error: ' + e.message); 
        await loadAdminData(); 
        renderAdminOverview('users'); 
    }
}
async function adminDeleteUser(userId) {
    if (!(await uiConfirm("Are you sure you want to delete this user?"))) return;
    try { await apiCall('admin_user_delete', { userId }); await loadAdminData(); renderAdminOverview('users'); } catch(e) { await uiAlert(e.message); }
}
async function adminAddUni() {
    const uniCode = document.getElementById('addUniCode').value.trim();
    const uniName = document.getElementById('addUniName').value.trim();
    if(!uniCode || !uniName) return await uiAlert("Fill all fields");
    if (!(await uiConfirm(`Add university "${uniName}" (${uniCode})?`))) return;
    try { await apiCall('admin_university_add', { uniCode, uniName }); await loadAdminData(); renderAdminOverview('institutions'); } catch(e) { await uiAlert(e.message); }
}
async function adminEditUni(oldCode) {
    const newCode = await uiPrompt("New Code:", oldCode);
    if (!newCode) return;
    const name = await uiPrompt("New Name:");
    if (!name) return;
    if (!(await uiConfirm(`Update university code to "${newCode}" and name to "${name}"?`))) return;
    try { await apiCall('admin_university_update', { oldCode, newCode, name }); await loadAdminData(); renderAdminOverview('institutions'); } catch(e) { await uiAlert(e.message); }
}
async function adminDelUni(code) {
    if(!(await uiConfirm("Delete university?"))) return;
    try { await apiCall('admin_university_delete', { code }); adminInstState.level='uni'; await loadAdminData(); renderAdminOverview('institutions'); } catch(e) { await uiAlert(e.message); }
}
async function adminAddDept(uniCode) {
    const deptCode = document.getElementById('addDeptCode').value.trim();
    const deptName = document.getElementById('addDeptName').value.trim();
    if(!deptCode || !deptName) return await uiAlert("Fill all fields");
    if (!(await uiConfirm(`Add department "${deptName}" (${deptCode})?`))) return;
    try { await apiCall('admin_department_add', { deptCode, deptName, uniCode }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminEditDept(id) {
    const code = await uiPrompt("New Dept Code:");
    const name = await uiPrompt("New Dept Name:");
    if (!code || !name) return;
    if (!(await uiConfirm(`Update department code to "${code}" and name to "${name}"?`))) return;
    try { await apiCall('admin_department_update', { id, code, name }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminDelDept(id) {
    if(!(await uiConfirm("Delete department?"))) return;
    try { await apiCall('admin_department_delete', { id }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminAddBatch(deptId) {
    const batchName = document.getElementById('addBatchName').value.trim();
    if(!batchName) return await uiAlert("Fill all fields");
    if (!(await uiConfirm(`Add batch "${batchName}"?`))) return;
    try { await apiCall('admin_batch_add', { batchName, deptId }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminEditBatch(id) {
    const name = await uiPrompt("New Batch Name:");
    if (!name) return;
    if (!(await uiConfirm(`Update batch name to "${name}"?`))) return;
    try { await apiCall('admin_batch_update', { id, name }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminDelBatch(id) {
    if(!(await uiConfirm("Delete batch?"))) return;
    try { await apiCall('admin_batch_delete', { id }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminAddCourse(batchId) {
    const courseCode = document.getElementById('addCourseCode').value.trim();
    const courseName = document.getElementById('addCourseName').value.trim();
    const creditHours = document.getElementById('addCourseCredits').value.trim();
    if(!courseCode || !courseName) return await uiAlert("Fill all fields");
    if (!(await uiConfirm(`Add course "${courseName}" (${courseCode})?`))) return;
    try { await apiCall('admin_course_add', { courseCode, courseName, batchId, creditHours }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminEditCourse(id) {
    const code = await uiPrompt("New Course Code:");
    const name = await uiPrompt("New Course Name:");
    if (!code || !name) return;
    if (!(await uiConfirm(`Update course code to "${code}" and name to "${name}"?`))) return;
    try { await apiCall('admin_course_update', { id, code, name }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminDelCourse(id) {
    if(!(await uiConfirm("Delete course?"))) return;
    try { await apiCall('admin_course_delete', { id }); await loadAdminData(); renderAdminInstView(); } catch(e) { await uiAlert(e.message); }
}
async function adminDeleteNotice(id) {
    if(!(await uiConfirm("Delete this notice globally?"))) return;
    try { await apiCall('admin_notice_delete', { id }); await loadAdminData(); renderAdminOverview('notices'); } catch(e) { await uiAlert(e.message); }
}
