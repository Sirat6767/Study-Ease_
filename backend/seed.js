/**
 * StudyEase Supabase Seed Script (Node.js)
 * ==========================================
 * Migrated from seed.php — creates 3 universities, departments,
 * batches, courses, users (via Supabase Auth Admin), and sample data.
 *
 * Usage:
 *   node seed.js
 *
 * NOTE: Run only ONCE on a fresh database.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl   = process.env.SUPABASE_URL;
const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Use Service Role key — bypasses all RLS, required for admin operations
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Helper: create user in Supabase Auth + public.users + personal_info ──────
async function createUser(email, password, role, name) {
  // 1. Create in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true  // skip email verification for seed
  });

  if (authError) {
    // If user already exists, fetch their ID
    if (authError.message.includes('already been registered')) {
      console.log(`  ⚠️  ${email} already exists, skipping auth creation.`);
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users.find(u => u.email === email);
      if (!existing) throw new Error(`Cannot find existing user: ${email}`);
      return existing.id;
    }
    throw new Error(`Auth error for ${email}: ${authError.message}`);
  }

  const userId = authData.user.id;

  // 2. Insert into public.users
  await supabase.from('users').insert({ id: userId, email, role });

  // 3. Insert into public.personal_info
  await supabase.from('personal_info').insert({ user_id: userId, name });

  return userId;
}

// ─── Main Seed Function ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Starting StudyEase seed...\n');

  // Guard: skip if already seeded
  const { count } = await supabase.from('universities').select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.log('⚠️  Database already has data. Skipping seed to avoid duplicates.');
    console.log('   If you want to re-seed, clear the database first.\n');
    process.exit(0);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1.  GLOBAL ADMIN
  // ───────────────────────────────────────────────────────────────────────────
  console.log('👤 Creating admin user...');
  const adminId = await createUser('admin@studyease.com', 'Admin@1234', 'admin', 'Admin Sam');

  // ───────────────────────────────────────────────────────────────────────────
  // UNIVERSITY 1: SSTU
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏛️  University 1: SSTU...');

  await supabase.from('universities').insert({ uni_code: 'SSTU', uni_name: 'State Science and Technology University' });

  const { data: sstDept } = await supabase.from('departments').insert({
    dept_code: 'CSE', dept_name: 'Computer Science and Engineering', uni_code: 'SSTU'
  }).select().single();

  // Users
  const modId     = await createUser('mod@sstu.edu',        'Mod@1234', 'university_moderator', 'Prof. Moderator');
  const crId      = await createUser('cr@studyease.com',    'Cr@12345', 'cr',                   'CR Jordan');
  const stuId1    = await createUser('test@studyease.com',  'Test@1234','student',               'Alex Student');
  const stuPendId = await createUser('alice@studyease.com', 'Alice@123','student',               'Alice Pending');

  // Moderator link
  await supabase.from('university_moderators').insert({ user_id: modId, uni_code: 'SSTU' });

  // Batch
  const { data: batch1 } = await supabase.from('batches').insert({
    batch_name: 'CSE-2023', dept_id: sstDept.dept_id, cr_user_id: crId
  }).select().single();

  // Academic info (CR + Student)
  await supabase.from('academic_info').insert([
    { user_id: crId,   dept_id: sstDept.dept_id, batch_id: batch1.batch_id, reg_no: 'REG-CR-001' },
    { user_id: stuId1, dept_id: sstDept.dept_id, batch_id: batch1.batch_id, reg_no: 'REG-ST-002' }
  ]);

  // Pending join request for Alice
  await supabase.from('batch_join_requests').insert({
    user_id: stuPendId, batch_id: batch1.batch_id, reg_no: 'REG-ST-003',
    message: 'Please approve my request!'
  });

  // Courses
  const { data: c1 } = await supabase.from('courses').insert({
    course_code: 'CSE201', course_name: 'Data Structures', batch_id: batch1.batch_id, credit_hours: 3.0
  }).select().single();

  const { data: c2 } = await supabase.from('courses').insert({
    course_code: 'EEE202', course_name: 'Digital Electronics', batch_id: batch1.batch_id, credit_hours: 3.0
  }).select().single();

  // Enrollments
  await supabase.from('student_enrollments').insert([
    { user_id: crId,   course_id: c1.course_id, batch_id: batch1.batch_id },
    { user_id: crId,   course_id: c2.course_id, batch_id: batch1.batch_id },
    { user_id: stuId1, course_id: c1.course_id, batch_id: batch1.batch_id },
    { user_id: stuId1, course_id: c2.course_id, batch_id: batch1.batch_id }
  ]);

  // Get enrollment IDs for grade components
  const { data: enrollments } = await supabase.from('student_enrollments')
    .select('id, course_id').eq('user_id', stuId1);

  const enroll1 = enrollments.find(e => e.course_id === c1.course_id);
  const enroll2 = enrollments.find(e => e.course_id === c2.course_id);

  // Grade Components
  await supabase.from('grade_components').insert([
    { enrollment_id: enroll1.id, course_id: c1.course_id, type: 'attendance', name: 'Attendance',  max_marks: 10,  obtained: 8.5  },
    { enrollment_id: enroll1.id, course_id: c1.course_id, type: 'ct',         name: 'CT-1',        max_marks: 15,  obtained: 12.0 },
    { enrollment_id: enroll1.id, course_id: c1.course_id, type: 'final',      name: 'Final Exam',  max_marks: 50,  obtained: 40.0 },
    { enrollment_id: enroll2.id, course_id: c2.course_id, type: 'midterm',    name: 'Midterm',     max_marks: 30,  obtained: 25.0 }
  ]);

  // Exams
  await supabase.from('exams').insert([
    { course_id: c1.course_id, batch_id: batch1.batch_id, created_by: crId, name: 'Data Structures Final',      exam_date: '2026-06-15', exam_time: '09:00:00', venue: 'Room 301', notes: 'Chapters 1–8' },
    { course_id: c2.course_id, batch_id: batch1.batch_id, created_by: crId, name: 'Digital Electronics Midterm', exam_date: '2026-05-20', exam_time: '11:00:00', venue: 'Lab B',    notes: 'Logic gates' }
  ]);

  // Notices
  await supabase.from('notices').insert([
    { title: 'Exam Schedule Released', description: 'Check your dashboards for the new schedule.', category: 'exam',  priority: 'high',   posted_by: 'CR Jordan', posted_by_user_id: crId, batch_id: batch1.batch_id, is_pinned: true  },
    { title: 'Class Cancelled',        description: "Today's EEE lab is cancelled.",              category: 'event', priority: 'medium', posted_by: 'CR Jordan', posted_by_user_id: crId, batch_id: batch1.batch_id, is_pinned: false }
  ]);

  // Tasks
  await supabase.from('tasks').insert([
    { user_id: stuId1, name: 'Review Chapter 1',   done: false, priority: 'high',   due_date: '2026-05-10' },
    { user_id: stuId1, name: 'Submit Assignment 1', done: true,  priority: 'normal', due_date: null         }
  ]);

  // Course Files
  await supabase.from('course_files').insert([
    { course_id: c1.course_id, uploaded_by: crId, file_url: 'https://example.com/slide1.pdf', file_name: 'Lecture 1 Slides', file_type: 'lecture'    },
    { course_id: c2.course_id, uploaded_by: crId, file_url: 'https://example.com/hw.pdf',     file_name: 'Homework 1',       file_type: 'assignment' }
  ]);

  console.log('  ✅ SSTU seeded.');

  // ───────────────────────────────────────────────────────────────────────────
  // UNIVERSITY 2: BUE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏛️  University 2: BUE...');

  await supabase.from('universities').insert({ uni_code: 'BUE', uni_name: 'Bangladesh University of Engineering' });

  const { data: bueDept } = await supabase.from('departments').insert({
    dept_code: 'EEE', dept_name: 'Electrical and Electronic Engineering', uni_code: 'BUE'
  }).select().single();

  const mod2Id = await createUser('mod2@bue.edu',  'Mod2@1234', 'university_moderator', 'Dr. BUE Moderator');
  const cr2Id  = await createUser('cr2@bue.edu',   'Cr2@12345', 'cr',                   'CR Maya');
  const bStu1  = await createUser('stu1@bue.edu',  'Stu1@1234', 'student',              'Bob EEE');
  const bStu2  = await createUser('stu2@bue.edu',  'Stu2@1234', 'student',              'Sara EEE');

  await supabase.from('university_moderators').insert({ user_id: mod2Id, uni_code: 'BUE' });

  const { data: bueBatch } = await supabase.from('batches').insert({
    batch_name: 'EEE-2022', dept_id: bueDept.dept_id, cr_user_id: cr2Id
  }).select().single();

  await supabase.from('academic_info').insert([
    { user_id: cr2Id, dept_id: bueDept.dept_id, batch_id: bueBatch.batch_id, reg_no: 'BUE-CR-001' },
    { user_id: bStu1, dept_id: bueDept.dept_id, batch_id: bueBatch.batch_id, reg_no: 'BUE-ST-002' },
    { user_id: bStu2, dept_id: bueDept.dept_id, batch_id: bueBatch.batch_id, reg_no: 'BUE-ST-003' }
  ]);

  const { data: bC1 } = await supabase.from('courses').insert({ course_code: 'EEE301', course_name: 'Circuit Analysis',   batch_id: bueBatch.batch_id, credit_hours: 3.0 }).select().single();
  const { data: bC2 } = await supabase.from('courses').insert({ course_code: 'EEE302', course_name: 'Signals and Systems', batch_id: bueBatch.batch_id, credit_hours: 3.0 }).select().single();

  await supabase.from('student_enrollments').insert([
    ...[cr2Id, bStu1, bStu2].flatMap(uid => [
      { user_id: uid, course_id: bC1.course_id, batch_id: bueBatch.batch_id },
      { user_id: uid, course_id: bC2.course_id, batch_id: bueBatch.batch_id }
    ])
  ]);

  await supabase.from('exams').insert({ course_id: bC1.course_id, batch_id: bueBatch.batch_id, created_by: cr2Id, name: 'Circuit Final', exam_date: '2026-07-10', exam_time: '10:00:00', venue: 'Room 201', notes: 'All chapters' });
  await supabase.from('notices').insert({ title: 'Lab Schedule', description: 'EEE lab sessions start next week.', category: 'event', priority: 'medium', posted_by: 'CR Maya', posted_by_user_id: cr2Id, batch_id: bueBatch.batch_id, is_pinned: false });

  console.log('  ✅ BUE seeded.');

  // ───────────────────────────────────────────────────────────────────────────
  // UNIVERSITY 3: NUST
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏛️  University 3: NUST...');

  await supabase.from('universities').insert({ uni_code: 'NUST', uni_name: 'National University of Science and Technology' });

  const { data: nustME } = await supabase.from('departments').insert({ dept_code: 'ME', dept_name: 'Mechanical Engineering', uni_code: 'NUST' }).select().single();
  const { data: nustCS } = await supabase.from('departments').insert({ dept_code: 'CS', dept_name: 'Computer Science',        uni_code: 'NUST' }).select().single();

  const mod3Id = await createUser('mod3@nust.edu', 'Mod3@1234', 'university_moderator', 'Prof. NUST Admin');
  const cr3Id  = await createUser('cr3@nust.edu',  'Cr3@12345', 'cr',                   'CR Liam');
  const cr4Id  = await createUser('cr4@nust.edu',  'Cr4@12345', 'cr',                   'CR Noah');
  const nStu1  = await createUser('stu3@nust.edu', 'Stu3@1234', 'student',              'Zara ME');
  const nStu2  = await createUser('stu4@nust.edu', 'Stu4@1234', 'student',              'Aiden CS');

  await supabase.from('university_moderators').insert({ user_id: mod3Id, uni_code: 'NUST' });

  const { data: nBatch1 } = await supabase.from('batches').insert({ batch_name: 'ME-2023', dept_id: nustME.dept_id, cr_user_id: cr3Id }).select().single();
  const { data: nBatch2 } = await supabase.from('batches').insert({ batch_name: 'CS-2024', dept_id: nustCS.dept_id, cr_user_id: cr4Id }).select().single();

  await supabase.from('academic_info').insert([
    { user_id: cr3Id, dept_id: nustME.dept_id, batch_id: nBatch1.batch_id, reg_no: 'NUST-ME-001' },
    { user_id: nStu1, dept_id: nustME.dept_id, batch_id: nBatch1.batch_id, reg_no: 'NUST-ME-002' },
    { user_id: cr4Id, dept_id: nustCS.dept_id, batch_id: nBatch2.batch_id, reg_no: 'NUST-CS-001' },
    { user_id: nStu2, dept_id: nustCS.dept_id, batch_id: nBatch2.batch_id, reg_no: 'NUST-CS-002' }
  ]);

  const { data: nC1 } = await supabase.from('courses').insert({ course_code: 'ME401',  course_name: 'Thermodynamics', batch_id: nBatch1.batch_id, credit_hours: 4.0 }).select().single();
  const { data: nC2 } = await supabase.from('courses').insert({ course_code: 'CS401',  course_name: 'Algorithms',     batch_id: nBatch2.batch_id, credit_hours: 3.0 }).select().single();

  await supabase.from('student_enrollments').insert([
    { user_id: cr3Id, course_id: nC1.course_id, batch_id: nBatch1.batch_id },
    { user_id: nStu1, course_id: nC1.course_id, batch_id: nBatch1.batch_id },
    { user_id: cr4Id, course_id: nC2.course_id, batch_id: nBatch2.batch_id },
    { user_id: nStu2, course_id: nC2.course_id, batch_id: nBatch2.batch_id }
  ]);

  await supabase.from('notices').insert([
    { title: 'Thermo Exam Date Set', description: 'Exam on July 20, Room 101.', category: 'exam',    priority: 'high',   posted_by: 'CR Liam', posted_by_user_id: cr3Id, batch_id: nBatch1.batch_id, is_pinned: true  },
    { title: 'CS Assignment 1',      description: 'Due Friday midnight via portal.', category: 'general', priority: 'medium', posted_by: 'CR Noah', posted_by_user_id: cr4Id, batch_id: nBatch2.batch_id, is_pinned: false }
  ]);

  console.log('  ✅ NUST seeded.');

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ✅  Seed Completed Successfully!                    ║
╠══════════════════════════════════════════════════════════════════╣
║  All passwords follow the same pattern: FirstLetter@12345       ║
╠══════════════════════════════════════════════════════════════════╣
║  ROLE            EMAIL                      PASSWORD            ║
║  ─────────────────────────────────────────────────────────────  ║
║  Admin           admin@studyease.com        Admin@1234          ║
║  ─────────────────────────────────────────────────────────────  ║
║  Student ✅      test@studyease.com         Test@1234           ║
║  Student ⏳      alice@studyease.com        Alice@123           ║
║  ─────────────────────────────────────────────────────────────  ║
║  CR (SSTU/CSE)   cr@studyease.com           Cr@12345            ║
║  CR (BUE/EEE)    cr2@bue.edu                Cr2@12345           ║
║  CR (NUST/ME)    cr3@nust.edu               Cr3@12345           ║
║  CR (NUST/CS)    cr4@nust.edu               Cr4@12345           ║
║  ─────────────────────────────────────────────────────────────  ║
║  Moderator (SSTU) mod@sstu.edu              Mod@1234            ║
║  Moderator (BUE)  mod2@bue.edu              Mod2@1234           ║
║  Moderator (NUST) mod3@nust.edu             Mod3@1234           ║
╚══════════════════════════════════════════════════════════════════╝
  `);
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
