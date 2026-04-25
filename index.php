<?php
// StudyEase — v5 Student-Driven Academic Planner
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyEase - Smart Study Planner</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>

<!-- ========== LOGIN PAGE ========== -->
<div id="loginPage" class="login-wrapper">
  <div class="login-image-section">
    <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80" alt="Study Planning">
    <div class="login-image-overlay">
      <div class="floating-shapes">
        <div class="shape shape-1"></div><div class="shape shape-2"></div>
        <div class="shape shape-3"></div><div class="shape shape-4"></div>
      </div>
      <h2>Plan Smarter<br>Achieve More</h2>
      <p>Transform your academic journey with intelligent planning tools and a shared class notice board.</p>
    </div>
  </div>
  <div class="login-form-section">
    <div class="login-card">
      <div class="brand">
        <div class="brand-logo">📚</div>
        <div class="brand-text">
          <h1>StudyEase</h1>
          <p>Your Academic Companion</p>
        </div>
      </div>

      <!-- LOGIN FORM -->
      <div id="loginForm">
        <div class="login-header"><h2>Welcome back! 👋</h2><p>Sign in to continue your journey</p></div>
        <div class="form-group">
          <label>Email Address</label>
          <div class="input-wrapper">
            <input type="email" id="loginEmail" placeholder="Enter your email">
            <span class="icon">📧</span>
          </div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <div class="input-wrapper">
            <input type="password" id="loginPassword" placeholder="Enter your password">
            <span class="icon">🔒</span>
          </div>
        </div>
        <button class="btn" onclick="login()">Sign In <span>→</span></button>
        <p class="switch-form">Don't have an account? <a onclick="showRegister()">Create one</a></p>

        <!-- Demo Accounts -->
        <div class="demo-accounts">
          <div class="demo-title">Quick Demo Login</div>
          <div class="demo-cards" style="grid-template-columns: repeat(3, 1fr);">
            <div class="demo-card student-demo" onclick="fillDemo('student')">
              <div class="demo-card-icon">🎓</div>
              <div class="demo-card-label">Student</div>
            </div>
            <div class="demo-card cr-demo" onclick="fillDemo('cr')">
              <div class="demo-card-icon">👑</div>
              <div class="demo-card-label">CR</div>
            </div>
            <div class="demo-card cr-demo" onclick="fillDemo('admin')">
              <div class="demo-card-icon">🛠️</div>
              <div class="demo-card-label">Admin</div>
            </div>
          </div>
        </div>
      </div>

      <!-- REGISTER FORM -->
      <div id="registerForm" class="hidden">
        <div class="login-header"><h2>Get Started ✨</h2><p>Create your account today</p></div>
        <div class="form-group">
          <label>Full Name</label>
          <div class="input-wrapper">
            <input type="text" id="regName" placeholder="Enter your name">
            <span class="icon">👤</span>
          </div>
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <div class="input-wrapper">
            <input type="email" id="regEmail" placeholder="Enter your email">
            <span class="icon">📧</span>
          </div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <div class="input-wrapper">
            <input type="password" id="regPassword" placeholder="Create a password">
            <span class="icon">🔒</span>
          </div>
        </div>
        <button class="btn" onclick="register()">Create Account <span>→</span></button>
        <p class="switch-form">Already have an account? <a onclick="showLogin()">Sign in</a></p>
      </div>
    </div>
  </div>
</div>

<!-- ========== LIMBO PAGE (Join Batch) ========== -->
<div id="limboPage" class="dashboard-wrapper hidden" style="justify-content:center; align-items:center; display:flex;">
    <div class="login-card" style="width: 100%; max-width: 500px; padding: 2rem;">
        <div class="brand" style="margin-bottom: 2rem;">
            <div class="brand-logo">📚</div>
            <div class="brand-text">
                <h1>Welcome, <span id="limboUserName">Student</span>!</h1>
                <p>Join your class batch to continue</p>
            </div>
        </div>
        
        <div id="limboPendingMsg" class="hidden" style="background: var(--surface-2); padding: 1.5rem; border-radius: var(--radius); text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
            <h3 style="margin-bottom: 0.5rem; color: var(--cr-color);">Request Pending</h3>
            <p>Your request to join batch <strong><span id="limboPendingBatch">...</span></strong> is awaiting CR approval.</p>
            <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="logout()">Sign Out</button>
        </div>

        <div id="limboJoinForm">
            <div class="form-group">
                <label>University</label>
                <select id="limboUni" class="input-wrapper" onchange="limboPopulateDepts()"></select>
            </div>
            <div class="form-group">
                <label>Department</label>
                <select id="limboDept" class="input-wrapper" onchange="limboPopulateBatches()"></select>
            </div>
            <div class="form-group">
                <label>Batch</label>
                <select id="limboBatch" class="input-wrapper"></select>
            </div>
            <div class="form-group">
                <label>Registration Number</label>
                <div class="input-wrapper"><input type="text" id="limboRegNo" placeholder="e.g. 2021-1-60-001"></div>
            </div>
            <button class="btn" onclick="submitJoinRequest()" style="width:100%; margin-top: 1rem;">Apply to Join <span>→</span></button>
            <button class="btn btn-secondary" style="width:100%; margin-top: 0.5rem;" onclick="logout()">Sign Out</button>
        </div>
    </div>
</div>

<!-- ========== DASHBOARD PAGE ========== -->
<div id="dashboardPage" class="dashboard-wrapper hidden">
  <nav class="navbar" id="mainNavbar">
    <div class="navbar-brand">
      <div class="navbar-logo" id="navLogo">📚</div>
      <h1 id="navTitle">StudyEase</h1>
    </div>
    <div class="navbar-actions">
      <div id="crNavBadge" class="cr-nav-badge hidden">👑 Class Representative</div>
      <div class="theme-toggle">
        <label class="theme-switch" for="themeToggle">
          <input type="checkbox" id="themeToggle" onchange="toggleTheme()">
          <span class="theme-slider"></span>
        </label>
      </div>
      <button onclick="logout()" class="btn btn-danger btn-small">🚪 Logout</button>
    </div>
  </nav>

  <div class="container">
    <!-- Academic Header info -->
    <div id="academicHeader" style="margin-bottom: 1.5rem; background: var(--surface); padding: 1rem; border-radius: var(--radius); display:flex; justify-content: space-between; align-items:center; border: 1px solid var(--border);">
      <div>
        <h3 id="ahName" style="margin:0;">Student Name</h3>
        <p id="ahReg" style="color: var(--text-muted); margin:0;">Reg: ...</p>
      </div>
      <div style="text-align: right;">
        <h4 id="ahBatch" style="margin:0; color: var(--primary);">Batch Name</h4>
        <p id="ahUni" style="color: var(--text-muted); margin:0; font-size: 0.9rem;">Dept of ... | Uni</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs" id="mainTabs">
      <button class="tab-btn active" onclick="showTab('overview', this)" id="overviewTabBtn">
        <span class="tab-icon">📊</span> Overview
      </button>
      <button class="tab-btn" onclick="showTab('courses', this)" id="coursesTabBtn">
        <span class="tab-icon">🎓</span> Courses & Grades
      </button>
      <button class="tab-btn" onclick="showTab('notices', this)" id="noticeTabBtn">
        <span class="tab-icon">📢</span> Notice Board
      </button>
      <button class="tab-btn cr-tab hidden" onclick="showTab('crpanel', this)" id="crTabBtn">
        <span class="tab-icon">👑</span> CR Panel
      </button>
      <button class="tab-btn cr-tab hidden" onclick="showTab('admin', this)" id="adminTabBtn">
        <span class="tab-icon">🛠️</span> Admin Panel
      </button>
    </div>

    <!-- OVERVIEW TAB -->
    <div id="overviewTab">
      <div class="grid">
        <div class="card">
          <div class="card-header">
            <h2><span class="icon">📅</span> Course Exams</h2>
          </div>
          <div id="examsList"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <h2><span class="icon">✅</span> Personal Tasks</h2>
            <button class="btn btn-small" onclick="showAddTask()">+ Add Task</button>
          </div>
          <div id="addTaskForm" class="add-form hidden">
            <input type="text" id="taskName" placeholder="Task description">
            <div class="add-form-buttons">
              <button class="btn" onclick="addTask()">Add</button>
              <button class="btn btn-secondary" onclick="hideAddTask()">Cancel</button>
            </div>
          </div>
          <div id="tasksList"></div>
        </div>
      </div>
    </div>

    <!-- COURSES TAB -->
    <div id="coursesTab" class="hidden">
      <div class="card" style="margin-bottom: 2rem;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
             <h2>CGPA: <span id="overallCgpa" style="color: var(--primary);">0.00</span></h2>
         </div>
         <p style="color: var(--text-muted); font-size: 0.9rem;">Courses are automatically assigned by your CR based on your batch enrollment.</p>
      </div>
      <div id="coursesList" class="grid"></div>
    </div>

    <!-- NOTICES TAB -->
    <div id="noticesTab" class="hidden">
      <div class="card">
        <div class="card-header">
          <h2><span class="icon">📢</span> Notice Board</h2>
        </div>
        <div id="noticesList"></div>
      </div>
    </div>

    <!-- CR PANEL TAB -->
    <div id="crpanelTab" class="hidden">
      <div class="card" style="margin-bottom: 1rem;">
        <div class="card-header"><h2><span class="icon">👤</span> Pending Join Requests</h2></div>
        <div id="crRequestsList"></div>
      </div>
      <div class="card" style="margin-bottom: 1rem;">
        <div class="card-header">
            <h2><span class="icon">📢</span> Manage Notices</h2>
            <button class="btn btn-small btn-cr" onclick="showCRAddForm()">+ Post Notice</button>
        </div>
        <div id="crAddNoticeForm" class="add-form hidden" style="border: 2px dashed var(--cr-color); background: var(--surface-2);">
            <input type="text" id="noticeTitle" placeholder="Notice Title">
            <textarea id="noticeDesc" placeholder="Notice Details"></textarea>
            <div style="display:flex; gap:10px; margin-bottom: 10px;">
                <select id="noticeCategory">
                    <option value="general">General</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="event">Event</option>
                </select>
                <select id="noticePriority">
                    <option value="general">📌 Normal</option>
                    <option value="high">🔴 High Priority</option>
                </select>
            </div>
            <div class="add-form-buttons">
                <button class="btn btn-cr" onclick="addNotice()">Post Notice</button>
                <button class="btn btn-secondary" onclick="hideCRAddForm()">Cancel</button>
            </div>
        </div>
        <div id="crNoticesList"></div>
      </div>
      <div class="grid">
          <div class="card">
            <div class="card-header">
                <h2><span class="icon">🎓</span> Manage Courses</h2>
                <button class="btn btn-small" onclick="document.getElementById('crAddCourseForm').classList.toggle('hidden')">+ Add Course</button>
            </div>
            <div id="crAddCourseForm" class="add-form hidden">
                <input type="text" id="crCourseCode" placeholder="Course Code (e.g. CSE201)">
                <input type="text" id="crCourseName" placeholder="Course Name">
                <input type="number" id="crCourseCredits" placeholder="Credits (e.g. 3.0)" value="3.0" step="0.5">
                <button class="btn" onclick="crAddCourse()" style="margin-top:10px; width:100%;">Create & Auto-Enroll Batch</button>
            </div>
            <div id="crCoursesList"></div>
          </div>
          <div class="card">
            <div class="card-header">
                <h2><span class="icon">📅</span> Manage Exams</h2>
                <button class="btn btn-small" onclick="document.getElementById('crAddExamForm').classList.toggle('hidden')">+ Add Exam</button>
            </div>
            <div id="crAddExamForm" class="add-form hidden">
                <select id="crExamCourseId" style="margin-bottom:10px; width:100%;"></select>
                <input type="text" id="crExamName" placeholder="Exam Name (e.g. Midterm)">
                <input type="date" id="crExamDate" style="margin-bottom:10px;">
                <input type="time" id="crExamTime" style="margin-bottom:10px;">
                <input type="text" id="crExamVenue" placeholder="Venue">
                <button class="btn" onclick="crAddExam()" style="margin-top:10px; width:100%;">Schedule Exam</button>
            </div>
            <div id="crExamsList"></div>
          </div>
      </div>
    </div>
    
    <!-- ADMIN PANEL -->
    <div id="adminTab" class="hidden">
      <div class="card"><div class="card-header"><h2>🛠️ Admin Overview</h2></div></div>
    </div>

  </div>
</div>

<script src="app.js?v=6"></script>
</body>
</html>
