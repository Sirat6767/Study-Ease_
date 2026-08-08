/**
 * StudyEase Supabase Seed Script (Node.js)
 * ==========================================
 * Creates universities, faculties, departments, batches, courses, users,
 * and realistic multi-faculty academic hierarchy sample data.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl   = process.env.SUPABASE_URL;
const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createUser(email, password, role, name) {
  let userId;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users?.find(u => u.email === email);
      if (!existing) throw new Error(`Cannot find existing user: ${email}`);
      userId = existing.id;
    } else {
      throw new Error(`Auth error for ${email}: ${authError.message}`);
    }
  } else {
    userId = authData.user.id;
  }

  await supabase.from('users').upsert({ id: userId, email, role }, { onConflict: 'id' });
  await supabase.from('personal_info').upsert({ user_id: userId, name }, { onConflict: 'user_id' });
  return userId;
}

async function getOrCreateUni(code, name) {
  const { data: all } = await supabase.from('universities').select('*');
  const found = all?.find(u => (u.university_code || u.uni_code) === code);
  if (found) return found;

  const { data: created, error } = await supabase.from('universities').insert({ university_code: code, university_name: name }).select().single();
  if (error) {
    const { data: createdFallback, error: err2 } = await supabase.from('universities').insert({ uni_code: code, uni_name: name }).select().single();
    if (err2) {
      const { data: refetch } = await supabase.from('universities').select('*');
      const f = refetch?.find(u => (u.university_code || u.uni_code) === code);
      if (f) return f;
      throw err2;
    }
    return createdFallback;
  }
  return created;
}

async function getOrCreateFac(uniId, code, name) {
  const { data: all } = await supabase.from('faculties').select('*').eq('university_id', uniId);
  const found = all?.find(f => (f.faculty_name || f.name) === name);
  if (found) return found;

  const { data: created, error } = await supabase.from('faculties').insert({ university_id: uniId, faculty_code: code, faculty_name: name }).select().single();
  if (error) {
    const { data: refetch } = await supabase.from('faculties').select('*').eq('university_id', uniId);
    const f = refetch?.find(f => (f.faculty_name || f.name) === name);
    if (f) return f;
    throw error;
  }
  return created;
}

async function getOrCreateDept(facId, code, name, uniCode) {
  const { data: all } = await supabase.from('departments').select('*');
  const found = all?.find(d => (d.department_name || d.dept_name) === name || (d.department_code || d.dept_code) === code);
  if (found) return found;

  const payload = {
    faculty_id: facId,
    department_code: code,
    department_name: name
  };

  const { data: created, error } = await supabase.from('departments').insert(payload).select().single();
  if (error) {
    const fallbackPayload = { faculty_id: facId, dept_code: code, dept_name: name, uni_code: uniCode };
    const { data: createdFallback, error: err2 } = await supabase.from('departments').insert(fallbackPayload).select().single();
    if (err2) {
      const { data: refetch } = await supabase.from('departments').select('*');
      const f = refetch?.find(d => (d.department_name || d.dept_name) === name || (d.department_code || d.dept_code) === code);
      if (f) return f;
      throw err2;
    }
    return createdFallback;
  }
  return created;
}

async function getOrCreateBatch(deptId, name, crUserId = null) {
  const { data: all } = await supabase.from('batches').select('*');
  const found = all?.find(b => (b.department_id === deptId || b.dept_id === deptId) && (b.batch_name || b.name) === name);
  if (found) {
    if (crUserId) await supabase.from('batches').update({ cr_user_id: crUserId }).eq(found.id ? 'id' : 'batch_id', found.id || found.batch_id);
    return found;
  }
  
  const { data: created, error } = await supabase.from('batches').insert({ department_id: deptId, batch_name: name, cr_user_id: crUserId }).select().single();
  if (error) {
    const { data: createdFallback, error: err2 } = await supabase.from('batches').insert({ dept_id: deptId, batch_name: name, cr_user_id: crUserId }).select().single();
    if (err2) {
      const { data: refetch } = await supabase.from('batches').select('*');
      const f = refetch?.find(b => (b.department_id === deptId || b.dept_id === deptId) && (b.batch_name || b.name) === name);
      if (f) return f;
      throw err2;
    }
    return createdFallback;
  }
  return created;
}

async function seed() {
  console.log('\n🌱 Starting StudyEase multi-faculty seed...\n');

  // 1. GLOBAL ADMIN
  console.log('👤 Creating admin user...');
  await createUser('admin@studyease.com', 'Admin@1234', 'admin', 'Admin Sam');

  // 2. UNIVERSITY 1: SSTU
  console.log('\n🏛️  University 1: SSTU (State Science and Technology University)...');
  const sstu = await getOrCreateUni('SSTU', 'State Science and Technology University');
  const sstuCode = sstu.university_code || sstu.uni_code || 'SSTU';

  const facScience  = await getOrCreateFac(sstu.id, 'FSCI', 'Faculty of Science');
  const facBusiness = await getOrCreateFac(sstu.id, 'FBUS', 'Faculty of Business');

  const deptCSE  = await getOrCreateDept(facScience.id, 'CSE', 'Computer Science & Engineering', sstuCode);
  const deptMath = await getOrCreateDept(facScience.id, 'MATH', 'Mathematics', sstuCode);
  const deptAcc  = await getOrCreateDept(facBusiness.id, 'ACC', 'Accounting', sstuCode);

  const modId     = await createUser('mod@sstu.edu',        'Mod@1234', 'university_moderator', 'Prof. Moderator');
  const crId      = await createUser('cr@studyease.com',    'Cr@12345', 'cr',                   'CR Jordan');
  const stuId1    = await createUser('test@studyease.com',  'Test@1234','student',               'Alex Student');
  const stuPendId = await createUser('alice@studyease.com', 'Alice@123','student',               'Alice Pending');

  await supabase.from('university_moderators').upsert({ user_id: modId, university_id: sstu.id }, { onConflict: 'user_id,university_id' });

  const batch1 = await getOrCreateBatch(deptCSE.id || deptCSE.dept_id, 'CSE-2023', crId);
  await getOrCreateBatch(deptMath.id || deptMath.dept_id, 'MATH-2024');
  await getOrCreateBatch(deptAcc.id || deptAcc.dept_id, 'ACC-2023');

  const batch1Id = batch1.id || batch1.batch_id;
  const deptCSEId = deptCSE.id || deptCSE.dept_id;

  await supabase.from('academic_info').upsert([
    { user_id: crId,   department_id: deptCSEId, batch_id: batch1Id, reg_no: 'REG-CR-001' },
    { user_id: stuId1, department_id: deptCSEId, batch_id: batch1Id, reg_no: 'REG-ST-002' }
  ], { onConflict: 'user_id' });

  await supabase.from('batch_join_requests').upsert({
    user_id: stuPendId, batch_id: batch1Id, reg_no: 'REG-ST-003', message: 'Please approve my request!'
  }, { onConflict: 'user_id,batch_id' });

  // Courses
  const { data: c1 } = await supabase.from('courses').upsert({ course_code: 'CSE201', course_name: 'Data Structures', batch_id: batch1Id, credit_hours: 3.0 }, { onConflict: 'course_code,batch_id' }).select().single();
  const { data: c2 } = await supabase.from('courses').upsert({ course_code: 'EEE202', course_name: 'Digital Electronics', batch_id: batch1Id, credit_hours: 3.0 }, { onConflict: 'course_code,batch_id' }).select().single();

  if (c1 && c2) {
    await supabase.from('student_enrollments').upsert([
      { user_id: crId,   course_id: c1.course_id, batch_id: batch1Id },
      { user_id: crId,   course_id: c2.course_id, batch_id: batch1Id },
      { user_id: stuId1, course_id: c1.course_id, batch_id: batch1Id },
      { user_id: stuId1, course_id: c2.course_id, batch_id: batch1Id }
    ], { onConflict: 'user_id,course_id' });

    const { data: enrollments } = await supabase.from('student_enrollments').select('id, course_id').eq('user_id', stuId1);
    const enroll1 = enrollments?.find(e => e.course_id === c1.course_id);
    const enroll2 = enrollments?.find(e => e.course_id === c2.course_id);

    if (enroll1 && enroll2) {
      await supabase.from('grade_components').upsert([
        { enrollment_id: enroll1.id, course_id: c1.course_id, type: 'attendance', name: 'Attendance',  max_marks: 10,  obtained: 8.5  },
        { enrollment_id: enroll1.id, course_id: c1.course_id, type: 'ct',         name: 'CT-1',        max_marks: 15,  obtained: 12.0 },
        { enrollment_id: enroll1.id, course_id: c1.course_id, type: 'final',      name: 'Final Exam',  max_marks: 50,  obtained: 40.0 },
        { enrollment_id: enroll2.id, course_id: c2.course_id, type: 'midterm',    name: 'Midterm',     max_marks: 30,  obtained: 25.0 }
      ], { onConflict: 'enrollment_id,name' });
    }
  }

  console.log('  ✅ SSTU seeded.');

  // 3. UNIVERSITY 2: BUE
  console.log('\n🏛️  University 2: BUE (Bangladesh University of Engineering)...');
  const bue = await getOrCreateUni('BUE', 'Bangladesh University of Engineering');
  const bueCode = bue.university_code || bue.uni_code || 'BUE';
  const bueFacEEE = await getOrCreateFac(bue.id, 'FEEE', 'Faculty of Electrical & Electronic Engineering');
  const bueDeptEEE = await getOrCreateDept(bueFacEEE.id, 'EEE', 'Electrical and Electronic Engineering', bueCode);

  const mod2Id = await createUser('mod2@bue.edu',  'Mod2@1234', 'university_moderator', 'Dr. BUE Moderator');
  const cr2Id  = await createUser('cr2@bue.edu',   'Cr2@12345', 'cr',                   'CR Maya');
  const bStu1  = await createUser('stu1@bue.edu',  'Stu1@1234', 'student',              'Bob EEE');
  const bStu2  = await createUser('stu2@bue.edu',  'Stu2@1234', 'student',              'Sara EEE');

  await supabase.from('university_moderators').upsert({ user_id: mod2Id, university_id: bue.id }, { onConflict: 'user_id,university_id' });
  const bueBatch = await getOrCreateBatch(bueDeptEEE.id || bueDeptEEE.dept_id, 'EEE-2022', cr2Id);
  const bueBatchId = bueBatch.id || bueBatch.batch_id;
  const bueDeptId  = bueDeptEEE.id || bueDeptEEE.dept_id;

  await supabase.from('academic_info').upsert([
    { user_id: cr2Id, department_id: bueDeptId, batch_id: bueBatchId, reg_no: 'BUE-CR-001' },
    { user_id: bStu1, department_id: bueDeptId, batch_id: bueBatchId, reg_no: 'BUE-ST-002' },
    { user_id: bStu2, department_id: bueDeptId, batch_id: bueBatchId, reg_no: 'BUE-ST-003' }
  ], { onConflict: 'user_id' });

  console.log('  ✅ BUE seeded.');

  // 4. UNIVERSITY 3: NUST
  console.log('\n🏛️  University 3: NUST (National University of Science and Technology)...');
  const nust = await getOrCreateUni('NUST', 'National University of Science and Technology');
  const nustCode = nust.university_code || nust.uni_code || 'NUST';
  const nustFacEng = await getOrCreateFac(nust.id, 'FENG', 'Faculty of Engineering');
  const nustME = await getOrCreateDept(nustFacEng.id, 'ME', 'Mechanical Engineering', nustCode);
  const nustCS = await getOrCreateDept(nustFacEng.id, 'CS', 'Computer Science', nustCode);

  const mod3Id = await createUser('mod3@nust.edu', 'Mod3@1234', 'university_moderator', 'Prof. NUST Admin');
  const cr3Id  = await createUser('cr3@nust.edu',  'Cr3@12345', 'cr',                   'CR Liam');
  const cr4Id  = await createUser('cr4@nust.edu',  'Cr4@12345', 'cr',                   'CR Noah');
  const nStu1  = await createUser('stu3@nust.edu', 'Stu3@1234', 'student',              'Zara ME');
  const nStu2  = await createUser('stu4@nust.edu', 'Stu4@1234', 'student',              'Aiden CS');

  await supabase.from('university_moderators').upsert({ user_id: mod3Id, university_id: nust.id }, { onConflict: 'user_id,university_id' });

  const nBatch1 = await getOrCreateBatch(nustME.id || nustME.dept_id, 'ME-2023', cr3Id);
  const nBatch2 = await getOrCreateBatch(nustCS.id || nustCS.dept_id, 'CS-2024', cr4Id);

  const nBatch1Id = nBatch1.id || nBatch1.batch_id;
  const nBatch2Id = nBatch2.id || nBatch2.batch_id;
  const nustMEId  = nustME.id || nustME.dept_id;
  const nustCSId  = nustCS.id || nustCS.dept_id;

  await supabase.from('academic_info').upsert([
    { user_id: cr3Id, department_id: nustMEId, batch_id: nBatch1Id, reg_no: 'NUST-ME-001' },
    { user_id: nStu1, department_id: nustMEId, batch_id: nBatch1Id, reg_no: 'NUST-ME-002' },
    { user_id: cr4Id, department_id: nustCSId, batch_id: nBatch2Id, reg_no: 'NUST-CS-001' },
    { user_id: nStu2, department_id: nustCSId, batch_id: nBatch2Id, reg_no: 'NUST-CS-002' }
  ], { onConflict: 'user_id' });

  console.log('  ✅ NUST seeded.');
  console.log('\n✅ Multi-faculty seed completed successfully!\n');
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
