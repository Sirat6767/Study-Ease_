const { supabase, supabaseAdmin } = require('../supabaseClient');

const verifyAdmin = async (userId) => {
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');
};

const overview = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);

    const counts = {};
    const tables = ['users', 'universities', 'departments', 'batches', 'courses', 'student_enrollments', 'exams', 'tasks', 'notices'];
    
    for (const table of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      counts[table] = count || 0;
    }

    const roles = ['student', 'cr', 'university_moderator', 'admin'];
    for (const role of roles) {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', role);
      counts[`role_${role}`] = count || 0;
    }

    const { data: users } = await supabase
      .from('users')
      .select('id, email, role, is_active, created_at, personal_info(name), academic_info(batch_id)')
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

    const { data: universities } = await supabase.from('universities').select('*').order('uni_name');
    const { data: departments } = await supabase.from('departments').select('*, universities(uni_name)').order('dept_name');
    const { data: batchesRaw } = await supabase
      .from('batches')
      .select('*, departments(dept_code, uni_code, universities(uni_code)), users!cr_user_id(personal_info(name))')
      .order('batch_id', { ascending: false });
    const { data: courses } = await supabase.from('courses').select('*, batches(batch_name)').order('course_id', { ascending: false });

    // Normalise batches so frontend can read crName directly
    const batches = (batchesRaw || []).map(b => ({
      ...b,
      crName: (Array.isArray(b.users) ? b.users[0] : b.users)?.personal_info?.name
           || (Array.isArray(b.users) ? b.users[0] : b.users)?.personal_info?.[0]?.name
           || null
    }));
    
    res.json({
      ok: true,
      counts,
      users: formattedUsers,
      universities: universities || [],
      departments: departments || [],
      batches,
      courses: courses || []
    });

  } catch (err) {
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const updateRole = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { userId, role, batchId, uniCode } = req.body;

    if (!userId || !['student', 'cr', 'university_moderator', 'admin'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }
    if (userId === req.user.id) return res.status(400).json({ ok: false, error: 'Cannot change your own role' });

    // Validate user exists
    const { data: targetUser } = await supabaseAdmin.from('users').select('role').eq('id', userId).single();
    if (!targetUser) return res.status(404).json({ ok: false, error: 'User not found' });

    // Handle new role logic
    if (role === 'cr' || role === 'student') {
      if (!batchId) return res.status(400).json({ ok: false, error: 'Please select a batch' });
      
      if (role === 'cr') {
        // ── Auto-demote the existing CR of this batch to student ──────────
        const { data: existingBatch } = await supabaseAdmin
          .from('batches')
          .select('cr_user_id')
          .eq('batch_id', batchId)
          .single();

        if (existingBatch?.cr_user_id && existingBatch.cr_user_id !== userId) {
          // Demote old CR → student role
          await supabaseAdmin
            .from('users')
            .update({ role: 'student' })
            .eq('id', existingBatch.cr_user_id);
          
          await supabaseAdmin.from('notifications').insert({
            user_id: existingBatch.cr_user_id,
            title: 'Role Updated',
            message: 'You have been demoted to STUDENT because a new Class Representative was assigned to your batch.',
            type: 'role_change'
          });
        }

        // Point batch to the new CR
        await supabaseAdmin.from('batches').update({ cr_user_id: userId }).eq('batch_id', batchId);
      }

      // Update academic_info
      const { data: aca } = await supabaseAdmin.from('academic_info').select('id').eq('user_id', userId).single();
      if (aca) {
        await supabaseAdmin.from('academic_info').update({ batch_id: batchId }).eq('user_id', userId);
      } else {
        // We need dept_id and reg_no to insert into academic_info
        const { data: batch } = await supabaseAdmin.from('batches').select('dept_id').eq('batch_id', batchId).single();
        
        // Try to get their reg_no from a past request
        const { data: req } = await supabaseAdmin.from('batch_join_requests')
          .select('reg_no').eq('user_id', userId).order('requested_at', { ascending: false }).limit(1).single();
          
        const regNo = req?.reg_no || `UNKNOWN_${Math.floor(Math.random()*10000)}`;

        await supabaseAdmin.from('academic_info').insert({ 
          user_id: userId, 
          batch_id: batchId,
          dept_id: batch?.dept_id,
          reg_no: regNo
        });
      }

      // Also automatically approve any pending/rejected requests for this batch
      await supabaseAdmin.from('batch_join_requests')
        .update({ status: 'approved' })
        .eq('user_id', userId)
        .eq('batch_id', batchId);
    } else if (role === 'university_moderator') {
      if (!uniCode) return res.status(400).json({ ok: false, error: 'Please select a university' });
      
      // Update university moderators
      await supabaseAdmin.from('university_moderators').delete().eq('user_id', userId);
      await supabaseAdmin.from('university_moderators').insert({ user_id: userId, uni_code: uniCode });
    }

    // Update role
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
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const addUniversity = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { uniCode, uniName } = req.body;
    if (!uniCode || !uniName) return res.status(400).json({ ok: false, error: 'uniCode and uniName required' });

    const { data, error } = await supabase.from('universities').insert({ uni_code: uniCode, uni_name: uniName }).select().single();
    if (error) throw error;

    res.json({ ok: true, university: data });
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ ok: false, error: err.message });
  }
};

const updateUniversity = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { id } = req.params;
    const { uniCode, uniName } = req.body;
    
    if (id !== uniCode) {
      // If code changed, check if new code exists
      const { data: existing } = await supabase.from('universities').select('uni_code').eq('uni_code', uniCode).single();
      if (existing) return res.status(409).json({ ok: false, error: 'University Code already exists' });
    }

    const { error } = await supabase.from('universities').update({ uni_code: uniCode, uni_name: uniName }).eq('uni_code', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const deleteUniversity = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { id } = req.params;
    const { error } = await supabase.from('universities').delete().eq('uni_code', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Cannot delete university due to existing references (departments, etc.)' });
  }
};

const getUserInfo = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { id } = req.params;

    // Step 1: Basic user info
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', id)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Step 2: Personal info (separate query — avoids join issues)
    const { data: pi } = await supabase
      .from('personal_info')
      .select('name, father_name, mother_name, contact_no, address')
      .eq('user_id', id)
      .single();

    // Step 3: Academic info + batch (flat join that Supabase can handle)
    const { data: ai } = await supabase
      .from('academic_info')
      .select('reg_no, batch_id, dept_id')
      .eq('user_id', id)
      .single();

    let batchInfo = null;
    if (ai?.batch_id) {
      const { data: batchRow } = await supabase
        .from('batches')
        .select('batch_name, dept_id, departments ( dept_code, uni_code )')
        .eq('batch_id', ai.batch_id)
        .single();
      batchInfo = batchRow;
    }

    const result = {
      id:         user.id,
      email:      user.email,
      role:       user.role,
      created_at: user.created_at,
      personal_info: pi ? [{
        name:        pi.name        || null,
        father_name: pi.father_name || null,
        mother_name: pi.mother_name || null,
        contact_no:  pi.contact_no  || null,
        address:     pi.address     || null
      }] : [],
      academic_info: ai ? [{
        reg_no: ai.reg_no || null,
        batches: batchInfo ? {
          batch_name:  batchInfo.batch_name,
          departments: batchInfo.departments
            ? { dept_code: batchInfo.departments.dept_code, uni_code: batchInfo.departments.uni_code }
            : null
        } : null
      }] : []
    };

    res.json({ ok: true, user: result });
  } catch (err) {
    console.error('getUserInfo error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

const addDepartment = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { deptCode, deptName, uniCode } = req.body;
    const { error } = await supabase.from('departments').insert({ dept_code: deptCode, dept_name: deptName, uni_code: uniCode });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};
const updateDepartment = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { id } = req.params;
    const { deptCode, deptName } = req.body;
    const { error } = await supabase.from('departments').update({ dept_code: deptCode, dept_name: deptName }).eq('dept_id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};
const deleteDepartment = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { error } = await supabase.from('departments').delete().eq('dept_id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: 'Cannot delete department with existing references' }); }
};

const addBatch = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { batchName, deptId } = req.body;
    const { error } = await supabase.from('batches').insert({ batch_name: batchName, dept_id: deptId });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};
const updateBatch = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { batchName } = req.body;
    const { error } = await supabase.from('batches').update({ batch_name: batchName }).eq('batch_id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};
const deleteBatch = async (req, res) => {
  try {
    await verifyAdmin(req.user.id);
    const { error } = await supabase.from('batches').delete().eq('batch_id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: 'Cannot delete batch with existing references' }); }
};

module.exports = {
  overview, updateRole, addUniversity, updateUniversity, deleteUniversity, getUserInfo,
  addDepartment, updateDepartment, deleteDepartment, addBatch, updateBatch, deleteBatch
};
