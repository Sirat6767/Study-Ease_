const { supabase, supabaseAdmin } = require('../supabaseClient');
const academicHierarchyService = require('../services/academicHierarchyService');

// ── GET /api/moderator/overview ───────────────────────────────────────────────
const getOverview = async (req, res) => {
  try {
    const { universityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);

    // 1. Universities
    let universities;
    if (isAdmin) {
      const { data } = await supabase.from('universities').select('id, university_code, university_name').is('deleted_at', null).order('university_name');
      universities = data || [];
    } else {
      const { data } = await supabase.from('universities').select('id, university_code, university_name').eq('id', universityId).is('deleted_at', null);
      universities = data || [];
    }

    // 2. Faculties
    let facQuery = supabase.from('faculties').select('id, university_id, faculty_code, faculty_name').is('deleted_at', null);
    if (!isAdmin) facQuery = facQuery.eq('university_id', universityId);
    const { data: faculties } = await facQuery.order('faculty_name');
    const facultyIds = (faculties || []).map(f => f.id);

    // 3. Departments
    let departments = [];
    if (facultyIds.length > 0) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, faculty_id, department_code, department_name, faculties(university_id)')
        .in('faculty_id', facultyIds)
        .is('deleted_at', null)
        .order('department_name');
      departments = deptData || [];
    }
    const deptIds = departments.map(d => d.id);

    // 4. Batches
    let batches = [];
    if (deptIds.length > 0) {
      const { data: batchData } = await supabase
        .from('batches')
        .select('id, batch_name, department_id, cr_user_id, departments(department_code, faculty_id, faculties(university_id))')
        .in('department_id', deptIds)
        .is('deleted_at', null)
        .order('id', { ascending: false });
      batches = batchData || [];
    }

    const batchIds = batches.map(b => b.id);

    // 5. Courses
    let courses = [];
    const courseIds_all = [];
    if (batchIds.length > 0) {
      const { data: courseData } = await supabase
        .from('courses')
        .select('course_id, course_code, course_name, credit_hours, batch_id')
        .in('batch_id', batchIds)
        .order('course_code');
      courses = courseData || [];
      courses.forEach(c => courseIds_all.push(c.course_id));
    }

    // 6. Course files
    let courseFiles = [];
    if (courseIds_all.length > 0) {
      const { data: fileData } = await supabase
        .from('course_files')
        .select('id, course_id, file_name, file_url, file_type')
        .in('course_id', courseIds_all);
      courseFiles = (fileData || []).map(f => ({
        id: f.id,
        courseId: f.course_id,
        name: f.file_name,
        url: f.file_url,
        type: f.file_type
      }));
    }

    // 7. Notices
    let notices = [];
    if (batchIds.length > 0) {
      const { data: noticeData } = await supabase
        .from('notices')
        .select('id, title, description, category, priority, is_pinned, posted_at, batch_id, posted_by')
        .in('batch_id', batchIds)
        .order('posted_at', { ascending: false });
      notices = noticeData || [];
    }

    // 8. Upcoming exams
    const today = new Date().toISOString().split('T')[0];
    let exams = [];
    if (batchIds.length > 0) {
      const { data: examData } = await supabase
        .from('exams')
        .select('id, name, exam_date, exam_time, venue, notes, course_id, batch_id, courses(course_code)')
        .in('batch_id', batchIds)
        .gte('exam_date', today)
        .order('exam_date', { ascending: true });
      exams = (examData || []).map(e => ({
        id: e.id, name: e.name, date: e.exam_date, time: e.exam_time,
        venue: e.venue, notes: e.notes, courseId: e.course_id,
        batchId: e.batch_id, courseCode: e.courses?.course_code
      }));
    }

    // 9. Students
    let students = [];
    if (batchIds.length > 0) {
      const { data: studentData } = await supabase
        .from('users')
        .select(`
          id, email, role,
          academic_info!inner(id, reg_no, batch_id),
          personal_info(name, avatar_url)
        `)
        .in('academic_info.batch_id', batchIds);

      students = (studentData || []).map(s => {
        const ai = Array.isArray(s.academic_info) ? s.academic_info[0] : s.academic_info;
        const pi = Array.isArray(s.personal_info) ? s.personal_info[0] : s.personal_info;
        return {
          academicId: ai?.id,
          userId: s.id,
          regNo: ai?.reg_no,
          batchId: ai?.batch_id,
          email: s.email,
          name: pi?.name || null,
          avatarUrl: pi?.avatar_url || null,
          role: s.role
        };
      });
    }

    // 10. Pending Requests
    let pendingRequests = [];
    if (batchIds.length > 0) {
      const { data: requestsData } = await supabase
        .from('batch_join_requests')
        .select(`
          id, user_id, reg_no, message, requested_at, batch_id, status,
          users!batch_join_requests_user_id_fkey(email, personal_info(name))
        `)
        .in('batch_id', batchIds)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      pendingRequests = (requestsData || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        batchId: r.batch_id,
        name: r.users?.personal_info?.name || r.users?.email,
        email: r.users?.email,
        regNo: r.reg_no,
        message: r.message,
        requestedAt: r.requested_at
      }));
    }

    res.json({
      ok: true,
      universityId: isAdmin ? null : universityId,
      universities,
      faculties: faculties || [],
      departments: departments || [],
      batches: batches.map(b => ({
        batchId: b.id,
        batch_id: b.id,
        batchName: b.batch_name,
        deptId: b.department_id,
        department_id: b.department_id,
        deptCode: b.departments?.department_code,
        universityId: b.departments?.faculties?.university_id,
        crUserId: b.cr_user_id
      })),
      courses,
      courseFiles,
      notices,
      exams,
      students,
      pendingRequests
    });
  } catch (err) {
    console.error('moderator overview error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

// ── Faculty Management ────────────────────────────────────────────────────────
const addFaculty = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { universityId, facultyCode, facultyName } = req.body;
    const targetUniId = universityId ? parseInt(universityId) : scopeUniversityId;

    if (!isAdmin && targetUniId !== scopeUniversityId) {
      return res.status(403).json({ ok: false, error: 'Forbidden: not your university' });
    }

    const { data, error } = await supabase.from('faculties').insert({
      university_id: targetUniId,
      faculty_code: facultyCode || null,
      faculty_name: facultyName
    }).select().single();

    if (error) throw error;
    res.json({ ok: true, faculty: data });
  } catch (err) { res.status(err.code === '23505' ? 409 : 500).json({ ok: false, error: err.message }); }
};

const updateFaculty = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { id } = req.params;
    const { facultyCode, facultyName } = req.body;

    await academicHierarchyService.assertFacultyOwnership(parseInt(id), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('faculties').update({
      faculty_code: facultyCode || null,
      faculty_name: facultyName
    }).eq('id', id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const deleteFaculty = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { id } = req.params;

    await academicHierarchyService.assertFacultyOwnership(parseInt(id), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('faculties').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: 'Cannot delete faculty with existing departments' }); }
};

// ── Department Management ─────────────────────────────────────────────────────
const addDepartment = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { facultyId, deptCode, deptName, departmentCode, departmentName } = req.body;
    const code = departmentCode || deptCode;
    const name = departmentName || deptName;

    if (!facultyId || !code || !name) return res.status(400).json({ ok: false, error: 'facultyId, code, and name required' });

    await academicHierarchyService.assertFacultyOwnership(parseInt(facultyId), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('departments').insert({
      faculty_id: parseInt(facultyId),
      department_code: code,
      department_name: name
    });

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const updateDepartment = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { id } = req.params;
    const { deptCode, deptName, departmentCode, departmentName } = req.body;
    const code = departmentCode || deptCode;
    const name = departmentName || deptName;

    await academicHierarchyService.assertDepartmentOwnership(parseInt(id), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('departments').update({ department_code: code, department_name: name }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const deleteDepartment = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { id } = req.params;

    await academicHierarchyService.assertDepartmentOwnership(parseInt(id), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('departments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: 'Cannot delete department with existing batches' }); }
};

// ── Batch Management ─────────────────────────────────────────────────────────
const addBatch = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { batchName, deptId, departmentId } = req.body;
    const dept_id = departmentId || deptId;

    if (!batchName || !dept_id) return res.status(400).json({ ok: false, error: 'batchName and departmentId required' });

    await academicHierarchyService.assertDepartmentOwnership(parseInt(dept_id), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('batches').insert({ batch_name: batchName, department_id: parseInt(dept_id) });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const updateBatch = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { id } = req.params;
    const { batchName } = req.body;

    await academicHierarchyService.assertBatchOwnership(parseInt(id), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('batches').update({ batch_name: batchName }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const deleteBatch = async (req, res) => {
  try {
    const { universityId: scopeUniversityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { id } = req.params;

    await academicHierarchyService.assertBatchOwnership(parseInt(id), scopeUniversityId, isAdmin);

    const { error } = await supabase.from('batches').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: 'Cannot delete batch with existing references' }); }
};

const deleteNotice = async (req, res) => {
  try {
    const { universityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const noticeId = parseInt(req.params.id);

    const { data: notice } = await supabase.from('notices').select('id, batch_id').eq('id', noticeId).single();
    if (!notice) return res.status(404).json({ ok: false, error: 'Notice not found' });

    await academicHierarchyService.assertBatchOwnership(notice.batch_id, universityId, isAdmin);

    const { error } = await supabase.from('notices').delete().eq('id', noticeId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const deleteMaterial = async (req, res) => {
  try {
    const { universityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const fileId = parseInt(req.params.id);

    const { data: file } = await supabase.from('course_files').select('id, course_id, courses(batch_id)').eq('id', fileId).single();
    if (!file) return res.status(404).json({ ok: false, error: 'Material not found' });

    await academicHierarchyService.assertBatchOwnership(file.courses?.batch_id, universityId, isAdmin);

    const { error } = await supabase.from('course_files').delete().eq('id', fileId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const removeStudent = async (req, res) => {
  try {
    const { universityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const targetUserId = req.params.userId;

    const { data: ai } = await supabase.from('academic_info').select('id, batch_id, user_id, users(role)').eq('user_id', targetUserId).single();
    if (!ai) return res.status(404).json({ ok: false, error: 'Student not found' });
    if (ai.users?.role === 'cr') return res.status(400).json({ ok: false, error: 'Cannot remove a CR this way. Change their role first.' });

    await academicHierarchyService.assertBatchOwnership(ai.batch_id, universityId, isAdmin);

    await supabaseAdmin.from('student_enrollments').delete().eq('user_id', targetUserId).eq('batch_id', ai.batch_id);
    await supabaseAdmin.from('academic_info').delete().eq('user_id', targetUserId);

    await supabaseAdmin.from('notifications').insert({
      user_id: targetUserId,
      title: 'Removed from Batch',
      message: 'You have been removed from your batch by a university moderator or admin.',
      type: 'role_change'
    });

    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const getUserInfo = async (req, res) => {
  try {
    const { universityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const targetUserId = req.params.userId;

    const { data: user, error: userErr } = await supabase.from('users').select('id, email, role, created_at').eq('id', targetUserId).single();
    if (userErr || !user) return res.status(404).json({ ok: false, error: 'User not found' });

    const { data: ai } = await supabase
      .from('academic_info')
      .select(`
        reg_no, department_id, batch_id,
        departments!inner(
          id, department_code, department_name,
          faculties!inner(
            id, faculty_code, faculty_name,
            universities!inner(id, university_code, university_name)
          )
        ),
        batches!inner(id, batch_name)
      `)
      .eq('user_id', targetUserId)
      .single();

    if (ai?.batch_id) {
      await academicHierarchyService.assertBatchOwnership(ai.batch_id, universityId, isAdmin);
    } else if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'Forbidden: User is not in your university' });
    }

    const { data: pi } = await supabase.from('personal_info').select('name, father_name, mother_name, contact_no, address').eq('user_id', targetUserId).single();

    const result = {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      name: pi?.name || null,
      personal_info: pi ? [pi] : [],
      academic: academicHierarchyService.formatAcademicObject(ai)
    };

    res.json({ ok: true, user: result });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const updateRole = async (req, res) => {
  try {
    const { universityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { userId, role, batchId } = req.body;

    if (!userId || !['student', 'cr'].includes(role) || !batchId) {
      return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }
    if (userId === req.user.id) return res.status(400).json({ ok: false, error: 'Cannot change your own role' });

    await academicHierarchyService.assertBatchOwnership(batchId, universityId, isAdmin);

    const { data: ai } = await supabaseAdmin.from('academic_info').select('id').eq('user_id', userId).eq('batch_id', batchId).single();
    if (!ai) return res.status(400).json({ ok: false, error: 'User is not in this batch' });

    if (role === 'cr') {
      const { data: existingBatch } = await supabaseAdmin.from('batches').select('cr_user_id').eq('id', batchId).single();
      if (existingBatch?.cr_user_id && existingBatch.cr_user_id !== userId) {
        await supabaseAdmin.from('users').update({ role: 'student' }).eq('id', existingBatch.cr_user_id);
        await supabaseAdmin.from('notifications').insert({
          user_id: existingBatch.cr_user_id,
          title: 'Role Updated',
          message: 'You have been demoted to STUDENT because a new Class Representative was assigned to your batch.',
          type: 'role_change'
        });
      }
      await supabaseAdmin.from('batches').update({ cr_user_id: userId }).eq('id', batchId);
    } else {
      const { data: existingBatch } = await supabaseAdmin.from('batches').select('cr_user_id').eq('id', batchId).single();
      if (existingBatch?.cr_user_id === userId) {
        await supabaseAdmin.from('batches').update({ cr_user_id: null }).eq('id', batchId);
      }
    }

    const { error } = await supabaseAdmin.from('users').update({ role }).eq('id', userId);
    if (error) throw error;

    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Role Updated',
      message: `Your account role has been updated to ${role.toUpperCase()} by a University Moderator.`,
      type: 'role_change'
    });

    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

const reviewRequest = async (req, res) => {
  try {
    const { universityId, isAdmin } = await academicHierarchyService.getModeratorScope(req.user.id, req.user.dbRole);
    const { requestId, status } = req.body;

    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ ok: false, error: 'Invalid status' });

    const { data: reqData } = await supabase.from('batch_join_requests').select('user_id, reg_no, batch_id').eq('id', requestId).eq('status', 'pending').single();
    if (!reqData) return res.status(404).json({ ok: false, error: 'Pending request not found' });

    await academicHierarchyService.assertBatchOwnership(reqData.batch_id, universityId, isAdmin);

    const { data: batchData } = await supabase.from('batches').select('department_id').eq('id', reqData.batch_id).single();

    await supabase.from('batch_join_requests').update({
      status,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);

    if (status === 'approved') {
      await supabase.from('academic_info').insert({
        user_id: reqData.user_id,
        department_id: batchData.department_id,
        batch_id: reqData.batch_id,
        reg_no: reqData.reg_no
      });

      const { data: enrollments } = await supabase.from('student_enrollments').select('course_id').eq('batch_id', reqData.batch_id);
      const uniqueCourses = [...new Set(enrollments?.map(e => e.course_id) || [])];

      if (uniqueCourses.length > 0) {
        const enrollsToInsert = uniqueCourses.map(cid => ({
          user_id: reqData.user_id,
          course_id: cid,
          batch_id: reqData.batch_id
        }));
        await supabase.from('student_enrollments').insert(enrollsToInsert);
      }
    }

    res.json({ ok: true });
  } catch (err) { res.status(err.message === 'Forbidden' ? 403 : 500).json({ ok: false, error: err.message }); }
};

module.exports = {
  getOverview, deleteNotice, deleteMaterial, removeStudent, getUserInfo, updateRole,
  addFaculty, updateFaculty, deleteFaculty,
  addDepartment, updateDepartment, deleteDepartment,
  addBatch, updateBatch, deleteBatch, reviewRequest
};
