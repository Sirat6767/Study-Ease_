const { supabase, supabaseAdmin } = require('../supabaseClient');
const academicHierarchyService = require('../services/academicHierarchyService');

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

    try {
      const { error: userInsertErr } = await supabaseAdmin.from('users').insert({
        id: userId,
        email,
        role: 'student'
      });

      if (userInsertErr) throw userInsertErr;

      const { error: infoInsertErr } = await supabaseAdmin.from('personal_info').insert({
        user_id: userId,
        name: name ? String(name).trim() : email.split('@')[0]
      });

      if (infoInsertErr) throw infoInsertErr;
    } catch (dbErr) {
      console.error('Registration DB insert failed, rolling back Auth user:', dbErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ ok: false, error: 'Registration failed. Please try again.' });
    }

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
      .select('id, email, role, personal_info(name, avatar_url)')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      return res.status(404).json({ ok: false, error: 'User not found in public.users' });
    }

    // Academic Info traversing Department -> Faculty -> University
    const { data: academicRow } = await supabase
      .from('academic_info')
      .select(`
        department_id, batch_id, reg_no,
        departments!inner(
          id, department_code, department_name,
          faculties!inner(
            id, faculty_code, faculty_name,
            universities!inner(id, university_code, university_name)
          )
        ),
        batches!inner(id, batch_name)
      `)
      .eq('user_id', userId)
      .single();

    let academic = null;
    let pendingRequest = null;

    if (academicRow) {
      academic = academicHierarchyService.formatAcademicObject(academicRow);
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
      .select('id, name, done, priority, due_date, file_url, file_name, archived')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('due_date', { ascending: true })
      .order('id', { ascending: true });

    // Archived tasks
    const { data: archivedTasks } = await supabase
      .from('tasks')
      .select('id, name, done, priority, due_date, file_url, file_name, archived')
      .eq('user_id', userId)
      .eq('archived', true)
      .order('id', { ascending: false })
      .limit(50);

    const mapTask = (t) => ({
      id: t.id,
      name: t.name,
      done: t.done,
      priority: t.priority,
      dueDate: t.due_date,
      fileUrl: t.file_url || null,
      fileName: t.file_name || null,
      archived: t.archived || false
    });

    const formattedTasks = tasks ? tasks.map(mapTask) : [];
    const formattedArchivedTasks = archivedTasks ? archivedTasks.map(mapTask) : [];

    let exams = [];
    let enrollments = [];
    let courseFiles = [];
    let notices = [];

    if (academic) {
      const batchId = academic.batch.id;

      // Enrollments
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
          code: e.courses?.course_code,
          title: e.courses?.course_name,
          creditHours: e.courses?.credit_hours,
          components: (e.grade_components || []).map(g => ({
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

      const enrolledCourseIds = enrollments.map(e => e.courseId);
      
      if (examData) {
        exams = examData
          .filter(ex => enrolledCourseIds.includes(ex.course_id))
          .map(ex => ({
            id: ex.id,
            courseId: ex.course_id,
            courseCode: ex.courses?.course_code,
            name: ex.name,
            date: ex.exam_date,
            time: ex.exam_time,
            venue: ex.venue,
            notes: ex.notes
          }));
      }

      if (enrolledCourseIds.length > 0) {
        const { data: fileData } = await supabase
          .from('course_files')
          .select('id, course_id, file_name, file_url, file_type')
          .in('course_id', enrolledCourseIds);

        if (fileData) {
          courseFiles = fileData.map(f => ({
            id: f.id,
            courseId: f.course_id,
            name: f.file_name,
            url: f.file_url,
            type: f.file_type
          }));
        }
      }

      const { data: noticeData } = await supabase
        .from('notices')
        .select('*')
        .eq('batch_id', batchId)
        .order('is_pinned', { ascending: false })
        .order('posted_at', { ascending: false });

      if (noticeData) notices = noticeData;
    }

    const pi = Array.isArray(userRow.personal_info) ? userRow.personal_info[0] : userRow.personal_info;

    res.json({
      ok: true,
      user: {
        id: userId,
        email: userRow.email,
        role: userRow.role,
        name: pi?.name || null,
        avatarUrl: pi?.avatar_url || null
      },
      academic,
      pendingRequest,
      exams,
      tasks: formattedTasks,
      archivedTasks: formattedArchivedTasks,
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
