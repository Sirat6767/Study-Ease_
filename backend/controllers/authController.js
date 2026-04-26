const { supabase, supabaseAdmin } = require('../supabaseClient');

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Please fill all fields' });

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return res.status(409).json({ ok: false, error: 'Email already registered' });
      }
      return res.status(400).json({ ok: false, error: authError?.message || 'Failed to create user' });
    }

    const userId = authData.user.id;

    // Insert into public.users
    await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      role: 'student'
    });

    // Insert into public.personal_info
    await supabaseAdmin.from('personal_info').insert({
      user_id: userId,
      name: name || email.split('@')[0]
    });

    res.json({ ok: true, message: 'Account created. You can sign in now.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

// Bootstrap user data on login/load
const bootstrap = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Fetch user details
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email, role, personal_info(name)')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      return res.status(404).json({ ok: false, error: 'User not found in public.users' });
    }

    // Academic Info
    const { data: academicRow } = await supabase
      .from('academic_info')
      .select(`
        dept_id, batch_id, reg_no,
        departments(dept_name, dept_code, universities(uni_name, uni_code)),
        batches(batch_name)
      `)
      .eq('user_id', userId)
      .single();

    let academic = null;
    let pendingRequest = null;

    if (academicRow) {
      academic = {
        deptId: academicRow.dept_id,
        batchId: academicRow.batch_id,
        regNo: academicRow.reg_no,
        deptName: academicRow.departments.dept_name,
        deptCode: academicRow.departments.dept_code,
        uniName: academicRow.departments.universities.uni_name,
        uniCode: academicRow.departments.universities.uni_code,
        batchName: academicRow.batches.batch_name
      };
    } else {
      // Check pending request
      const { data: reqRow } = await supabase
        .from('batch_join_requests')
        .select('id, batch_id, status, message')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .single();
        
      if (reqRow) {
        pendingRequest = { id: reqRow.id, batchId: reqRow.batch_id, status: reqRow.status, message: reqRow.message };
      }
    }

    // Personal Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, name, done, priority, due_date')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
      .order('id', { ascending: true });

    const formattedTasks = tasks ? tasks.map(t => ({
      id: t.id,
      name: t.name,
      done: t.done,
      priority: t.priority,
      dueDate: t.due_date
    })) : [];

    // Initialize arrays
    let exams = [];
    let enrollments = [];
    let courseFiles = [];
    let notices = [];

    if (academic) {
      const batchId = academic.batchId;

      // Enrollments and Grade Components
      const { data: enrollData } = await supabase
        .from('student_enrollments')
        .select(`
          id, course_id,
          courses(course_code, course_name, credit_hours),
          grade_components(id, type, name, max_marks, obtained)
        `)
        .eq('user_id', userId)
        .eq('batch_id', batchId)
        .order('id', { ascending: true });

      if (enrollData) {
        enrollments = enrollData.map(e => ({
          enrollId: e.id,
          courseId: e.course_id,
          code: e.courses.course_code,
          title: e.courses.course_name,
          creditHours: e.courses.credit_hours,
          components: e.grade_components.map(g => ({
            id: g.id,
            type: g.type,
            name: g.name,
            maxMarks: g.max_marks,
            obtained: g.obtained
          }))
        }));
      }

      // Exams
      const { data: examData } = await supabase
        .from('exams')
        .select(`
          id, course_id, name, exam_date, exam_time, venue, notes,
          courses!inner(course_code)
        `)
        .eq('batch_id', batchId)
        .order('exam_date', { ascending: true });

      // We only want exams for courses the user is enrolled in
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      
      if (examData) {
        exams = examData
          .filter(ex => enrolledCourseIds.includes(ex.course_id))
          .map(ex => ({
            id: ex.id,
            courseId: ex.course_id,
            courseCode: ex.courses.course_code,
            name: ex.name,
            date: ex.exam_date,
            time: ex.exam_time,
            venue: ex.venue,
            notes: ex.notes
          }));
      }

      // Notices
      const { data: noticeData } = await supabase
        .from('notices')
        .select('*')
        .eq('batch_id', batchId)
        .order('is_pinned', { ascending: false })
        .order('posted_at', { ascending: false });

      if (noticeData) notices = noticeData;
    }

    res.json({
      ok: true,
      user: {
        id: userId,
        email: userRow.email,
        role: userRow.role,
        name: userRow.personal_info?.[0]?.name || userRow.email
      },
      academic,
      pendingRequest,
      exams,
      tasks: formattedTasks,
      enrollments,
      courseFiles,
      notices
    });

  } catch (err) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

module.exports = {
  bootstrap,
  register
};
