const { supabase, supabaseAdmin } = require('../supabaseClient');
const academicHierarchyService = require('../services/academicHierarchyService');

const overview = async (req, res) => {
  try {
    const counts = {};
    const tables = ['users', 'universities', 'faculties', 'departments', 'batches', 'courses', 'student_enrollments', 'exams', 'tasks', 'notices'];
    const roles = ['student', 'cr', 'university_moderator', 'admin'];

    const [tableResults, roleResults] = await Promise.all([
      Promise.all(tables.map(table => supabase.from(table).select('*', { count: 'exact', head: true }).is('deleted_at', null))),
      Promise.all(roles.map(role => supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', role).is('deleted_at', null)))
    ]);

    tables.forEach((table, i) => {
      counts[table] = tableResults[i]?.count || 0;
    });

    roles.forEach((role, i) => {
      counts[`role_${role}`] = roleResults[i]?.count || 0;
    });

    const { data: users } = await supabase
      .from('users')
      .select('id, email, role, is_active, created_at, personal_info(name), academic_info(batch_id)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const formattedUsers = users?.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      name: Array.isArray(u.personal_info) ? u.personal_info[0]?.name : u.personal_info?.name,
      batchId: Array.isArray(u.academic_info) ? u.academic_info[0]?.batch_id : u.academic_info?.batch_id,
      isActive: u.is_active,
      createdAt: u.created_at
    })) || [];

    const { data: universities } = await supabase.from('universities').select('id, university_code, university_name').is('deleted_at', null).order('university_name');
    const { data: faculties }    = await supabase.from('faculties').select('id, university_id, faculty_code, faculty_name').is('deleted_at', null).order('faculty_name');
    const { data: departments }  = await supabase.from('departments').select('id, faculty_id, department_code, department_name, faculties(faculty_name, university_id, universities(university_name, university_code))').is('deleted_at', null).order('department_name');
    const { data: batchesRaw }   = await supabase.from('batches').select('id, department_id, batch_name, cr_user_id, departments(department_code, faculty_id, faculties(faculty_name, university_id, universities(id, university_code, university_name))), users!cr_user_id(personal_info(name))').is('deleted_at', null).order('id', { ascending: false });
    const { data: courses }      = await supabase.from('courses').select('course_id, course_code, course_name, credit_hours, batch_id, batches(batch_name)').order('course_id', { ascending: false });
    const { data: notices }      = await supabase.from('notices').select('id, title, description, category, priority, is_pinned, posted_at, batch_id');

    const batches = (batchesRaw || []).map(b => ({
      ...b,
      batch_id: b.id,
      batchId: b.id,
      dept_id: b.department_id,
      deptId: b.department_id,
      crName: (Array.isArray(b.users) ? b.users[0] : b.users)?.personal_info?.name
           || (Array.isArray(b.users) ? b.users[0] : b.users)?.personal_info?.[0]?.name
           || null
    }));
    
    res.json({
      ok: true,
      counts,
      users: formattedUsers,
      universities: universities || [],
      faculties: faculties || [],
      departments: departments || [],
      batches,
      courses: courses || [],
      notices: notices || []
    });

  } catch (err) {
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { userId, role, batchId, universityId } = req.body;

    if (!userId || !['student', 'cr', 'university_moderator', 'admin'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }
    if (userId === req.user.id) return res.status(400).json({ ok: false, error: 'Cannot change your own role' });

    const { data: targetUser } = await supabaseAdmin.from('users').select('role').eq('id', userId).single();
    if (!targetUser) return res.status(404).json({ ok: false, error: 'User not found' });

    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('assign_user_role_transactional', {
      p_target_user_id: userId,
      p_role: role,
      p_batch_id: batchId ? parseInt(batchId) : null,
      p_university_id: universityId ? parseInt(universityId) : null,
      p_assigned_by: req.user.id
    });

    if (!rpcErr && rpcRes) {
      if (!rpcRes.ok) return res.status(400).json(rpcRes);
      return res.json({ ok: true });
    }

    if (role === 'cr' || role === 'student') {
      if (!batchId) return res.status(400).json({ ok: false, error: 'Please select a batch' });
      
      if (role === 'cr') {
        const { data: existingBatch } = await supabaseAdmin
          .from('batches')
          .select('cr_user_id')
          .eq('id', batchId)
          .single();

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
      }

      const { data: aca } = await supabaseAdmin.from('academic_info').select('id').eq('user_id', userId).single();
      if (aca) {
        await supabaseAdmin.from('academic_info').update({ batch_id: batchId }).eq('user_id', userId);
      } else {
        const { data: batch } = await supabaseAdmin.from('batches').select('department_id').eq('id', batchId).single();
        const { data: reqData } = await supabaseAdmin.from('batch_join_requests')
          .select('reg_no').eq('user_id', userId).order('requested_at', { ascending: false }).limit(1).single();
          
        const regNo = reqData?.reg_no || `UNKNOWN_${Math.floor(Math.random()*10000)}`;

        await supabaseAdmin.from('academic_info').insert({ 
          user_id: userId, 
          batch_id: batchId,
          department_id: batch?.department_id,
          reg_no: regNo
        });
      }

      await supabaseAdmin.from('batch_join_requests')
        .update({ status: 'approved' })
        .eq('user_id', userId)
        .eq('batch_id', batchId);
    } else if (role === 'university_moderator') {
      if (!universityId) return res.status(400).json({ ok: false, error: 'Please select a university' });
      await supabaseAdmin.from('university_moderators').delete().eq('user_id', userId);
      await supabaseAdmin.from('university_moderators').insert({ user_id: userId, university_id: universityId });
    }

    const { error } = await supabaseAdmin.from('users').update({ role }).eq('id', userId);
    if (error) throw error;

    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Role Updated',
      message: `Your account role has been updated to ${role.toUpperCase()} by an Admin.`,
      type: 'role_change'
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('updateRole error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: 'Failed to update user role' });
  }
};

const addUniversity = async (req, res) => {
  try {
    const { uniCode, uniName, universityCode, universityName } = req.body;
    const code = universityCode || uniCode;
    const name = universityName || uniName;
    if (!code || !name) return res.status(400).json({ ok: false, error: 'university_code and university_name required' });

    const { data, error } = await supabase.from('universities').insert({ university_code: code, university_name: name }).select().single();
    if (error) throw error;

    res.json({ ok: true, university: data });
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ ok: false, error: err.message });
  }
};

const updateUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const { uniCode, uniName, universityCode, universityName } = req.body;
    const code = universityCode || uniCode;
    const name = universityName || uniName;

    const { error } = await supabase.from('universities').update({ university_code: code, university_name: name }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const deleteUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('universities').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Cannot delete university with existing references' });
  }
};

// ── Faculty CRUD ─────────────────────────────────────────────────────────────
const addFaculty = async (req, res) => {
  try {
    const { universityId, facultyCode, facultyName } = req.body;
    if (!universityId || !facultyName) return res.status(400).json({ ok: false, error: 'universityId and facultyName required' });

    const { data, error } = await supabase.from('faculties').insert({
      university_id: parseInt(universityId),
      faculty_code: facultyCode || null,
      faculty_name: facultyName
    }).select().single();

    if (error) throw error;
    res.json({ ok: true, faculty: data });
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ ok: false, error: err.message });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyCode, facultyName } = req.body;
    const { error } = await supabase.from('faculties').update({
      faculty_code: facultyCode || null,
      faculty_name: facultyName
    }).eq('id', id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('faculties').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Cannot delete faculty with existing departments' });
  }
};

// ── Department CRUD ──────────────────────────────────────────────────────────
const addDepartment = async (req, res) => {
  try {
    const { facultyId, deptCode, deptName, departmentCode, departmentName } = req.body;
    const code = departmentCode || deptCode;
    const name = departmentName || deptName;
    if (!facultyId || !code || !name) return res.status(400).json({ ok: false, error: 'facultyId, departmentCode, departmentName required' });

    const { error } = await supabase.from('departments').insert({
      faculty_id: parseInt(facultyId),
      department_code: code,
      department_name: name
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { deptCode, deptName, departmentCode, departmentName } = req.body;
    const code = departmentCode || deptCode;
    const name = departmentName || deptName;

    const { error } = await supabase.from('departments').update({ department_code: code, department_name: name }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const deleteDepartment = async (req, res) => {
  try {
    const { error } = await supabase.from('departments').update({ deleted_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: 'Cannot delete department with existing batches' }); }
};

// ── Batch CRUD ───────────────────────────────────────────────────────────────
const addBatch = async (req, res) => {
  try {
    const { batchName, deptId, departmentId } = req.body;
    const dept_id = departmentId || deptId;
    if (!batchName || !dept_id) return res.status(400).json({ ok: false, error: 'batchName and departmentId required' });

    const { error } = await supabase.from('batches').insert({ batch_name: batchName, department_id: parseInt(dept_id) });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const updateBatch = async (req, res) => {
  try {
    const { batchName } = req.body;
    const { error } = await supabase.from('batches').update({ batch_name: batchName }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const deleteBatch = async (req, res) => {
  try {
    const { error } = await supabase.from('batches').update({ deleted_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: 'Cannot delete batch with existing references' }); }
};

// ── User Info Popup ───────────────────────────────────────────────────────────
const getUserInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', id)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const { data: pi } = await supabase
      .from('personal_info')
      .select('name, father_name, mother_name, contact_no, address')
      .eq('user_id', id)
      .single();

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
      .eq('user_id', id)
      .single();

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
  } catch (err) {
    console.error('getUserInfo error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// ── RESTful Hierarchy Endpoints ──────────────────────────────────────────────
const getFacultiesByUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('faculties').select('*').eq('university_id', id).is('deleted_at', null).order('faculty_name');
    if (error) throw error;
    res.json({ ok: true, faculties: data || [] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getDepartmentsByFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('departments').select('*').eq('faculty_id', id).is('deleted_at', null).order('department_name');
    if (error) throw error;
    res.json({ ok: true, departments: data || [] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getBatchesByDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('batches').select('*').eq('department_id', id).is('deleted_at', null).order('batch_name', { ascending: false });
    if (error) throw error;
    res.json({ ok: true, batches: data || [] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = {
  overview, updateRole, addUniversity, updateUniversity, deleteUniversity, getUserInfo,
  addFaculty, updateFaculty, deleteFaculty,
  addDepartment, updateDepartment, deleteDepartment,
  addBatch, updateBatch, deleteBatch,
  getFacultiesByUniversity, getDepartmentsByFaculty, getBatchesByDepartment
};
