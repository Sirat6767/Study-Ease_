const { supabase } = require('../supabaseClient');

// --- TASKS ---
const addTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, priority = 'normal', dueDate } = req.body;
    
    if (!name) return res.status(400).json({ ok: false, error: 'Task name required' });
    
    const validPriority = ['low', 'normal', 'high'].includes(priority) ? priority : 'normal';

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        name,
        priority: validPriority,
        due_date: dueDate || null
      })
      .select()
      .single();

    if (error) throw error;
    res.json({
      ok: true,
      task: {
        id: data.id,
        name: data.name,
        done: data.done,
        priority: data.priority,
        dueDate: data.due_date
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to add task' });
  }
};

const toggleTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('done')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !task) return res.status(404).json({ ok: false, error: 'Task not found' });

    const newStatus = !task.done;
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ done: newStatus })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) throw updateError;
    res.json({ ok: true, done: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to toggle task' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to delete task' });
  }
};

// --- GRADE COMPONENTS ---
const addComponent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enrollmentId, courseId, type = 'other', name, maxMarks, obtained } = req.body;

    if (!enrollmentId || !courseId || !name || maxMarks === undefined || obtained === undefined) {
      return res.status(400).json({ ok: false, error: 'Invalid data' });
    }
    if (obtained > maxMarks) return res.status(400).json({ ok: false, error: 'Obtained cannot exceed maximum' });

    // Verify enrollment belongs to user
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('id', enrollmentId)
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (!enrollment) return res.status(404).json({ ok: false, error: 'Enrollment not found' });

    const { data, error } = await supabase
      .from('grade_components')
      .insert({
        enrollment_id: enrollmentId,
        course_id: courseId,
        type,
        name,
        max_marks: maxMarks,
        obtained
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ ok: false, error: 'A component with this name already exists' });
      throw error;
    }
    res.json({
      ok: true,
      component: {
        id: data.id,
        type: data.type,
        name: data.name,
        maxMarks: data.max_marks,
        obtained: data.obtained
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to add component' });
  }
};

const updateComponent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { enrollmentId, type, name, maxMarks, obtained } = req.body;

    // Verify enrollment
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('id', enrollmentId)
      .eq('user_id', userId)
      .single();

    if (!enrollment) return res.status(404).json({ ok: false, error: 'Enrollment not found' });

    const { data: updated, error } = await supabase
      .from('grade_components')
      .update({ type, name, max_marks: maxMarks, obtained })
      .eq('id', id)
      .eq('enrollment_id', enrollmentId)
      .select()
      .single();

    if (error) throw error;
    res.json({
      ok: true,
      component: {
        id: updated.id,
        type: updated.type,
        name: updated.name,
        maxMarks: updated.max_marks,
        obtained: updated.obtained
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to update component' });
  }
};

const deleteComponent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, enrollmentId } = req.params;

    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('id', enrollmentId)
      .eq('user_id', userId)
      .single();

    if (!enrollment) return res.status(404).json({ ok: false, error: 'Enrollment not found' });

    const { error } = await supabase
      .from('grade_components')
      .delete()
      .eq('id', id)
      .eq('enrollment_id', enrollmentId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to delete component' });
  }
};

// --- INSTITUTIONS ---
const getInstitutions = async (req, res) => {
  try {
    const [uniRes, deptRes, batchRes] = await Promise.all([
      supabase.from('universities').select('*').order('uni_name'),
      supabase.from('departments').select('*').order('dept_name'),
      supabase.from('batches').select('*').order('batch_name', { ascending: false })
    ]);

    res.json({
      ok: true,
      universities: uniRes.data || [],
      departments: deptRes.data || [],
      batches: batchRes.data || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to load institutions' });
  }
};

const joinBatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { batchId, regNo, message } = req.body;

    if (!batchId || !regNo) return res.status(400).json({ ok: false, error: 'Batch and Reg No required' });

    // Check if there is already a request
    const { data: existing } = await supabase
      .from('batch_join_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('batch_id', batchId)
      .single();

    if (existing && existing.status === 'pending') {
      return res.status(409).json({ ok: false, error: 'You already have a pending request for this batch' });
    }

    if (existing && (existing.status === 'rejected' || existing.status === 'approved')) {
      // update the existing request back to pending
      const { error } = await supabase
        .from('batch_join_requests')
        .update({
          status: 'pending',
          reg_no: regNo,
          message: message || null,
          requested_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // insert new request
      const { error } = await supabase
        .from('batch_join_requests')
        .insert({
          user_id: userId,
          batch_id: batchId,
          reg_no: regNo,
          message: message || null
        });
      if (error) throw error;
    }

    // Find the CR and notify them
    const { data: batch } = await supabase.from('batches').select('cr_user_id').eq('batch_id', batchId).single();
    if (batch?.cr_user_id) {
      const { data: pi } = await supabase.from('personal_info').select('name').eq('user_id', userId).single();
      await supabase.from('notifications').insert({
        user_id: batch.cr_user_id,
        title: 'New Batch Join Request',
        message: `${pi?.name || 'A student'} (Reg: ${regNo}) has applied to join your batch.`,
        type: 'batch_request'
      });
    }

    res.json({ ok: true, message: 'Request sent. Please wait for CR approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to join batch' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: personal } = await supabase
      .from('personal_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: academic } = await supabase
      .from('academic_info')
      .select('*, departments(dept_name), batches(batch_name)')
      .eq('user_id', userId)
      .single();

    res.json({
      ok: true,
      personal: personal || {},
      academic: academic ? {
        ...academic,
        dept_name: academic.departments?.dept_name,
        batch_name: academic.batches?.batch_name
      } : {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, data } = req.body; // type: 'personal' or 'academic'

    if (type === 'personal') {
      const { name, father_name, mother_name, contact_no, address } = data;
      const { error } = await supabase
        .from('personal_info')
        .upsert({
          user_id: userId,
          name,
          father_name,
          mother_name,
          contact_no,
          address
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } else if (type === 'academic') {
      const { reg_no } = data;
      // Note: dept_id and batch_id usually shouldn't be changed by student if already approved
      const { error } = await supabase
        .from('academic_info')
        .update({ reg_no })
        .eq('user_id', userId);

      if (error) throw error;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to update profile' });
  }
};
const getMyBatchMembers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user's batch
    const { data: academic } = await supabase
      .from('academic_info')
      .select('batch_id')
      .eq('user_id', userId)
      .single();

    if (!academic?.batch_id) return res.status(400).json({ ok: false, error: 'No batch found for user' });

    const batchId = academic.batch_id;

    // Get CR of batch
    const { data: batchRow } = await supabase
      .from('batches')
      .select('cr_user_id')
      .eq('batch_id', batchId)
      .single();

    // Get all members
    const { data: members, error } = await supabase
      .from('academic_info')
      .select('user_id, reg_no, users!academic_info_user_id_fkey(personal_info(name))')
      .eq('batch_id', batchId);

    if (error) throw error;

    const crUserId = batchRow?.cr_user_id;

    const formatted = (members || []).map(m => ({
      userId: m.user_id,
      name: m.users?.personal_info?.name || 'Unknown',
      regNo: m.reg_no,
      isCR: m.user_id === crUserId
    }));

    formatted.sort((a, b) => {
      if (a.isCR && !b.isCR) return -1;
      if (!a.isCR && b.isCR) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    res.json({ ok: true, members: formatted });
  } catch (err) {
    console.error('getMyBatchMembers error:', err);
    res.status(500).json({ ok: false, error: 'Failed to load batch members' });
  }
};


module.exports = {
  addTask, toggleTask, deleteTask, 
  addComponent, updateComponent, deleteComponent,
  getInstitutions, joinBatch,
  getProfile, updateProfile,
  getMyBatchMembers
};
