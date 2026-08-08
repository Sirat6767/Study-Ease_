const { supabase } = require('../supabaseClient');
const academicHierarchyService = require('../services/academicHierarchyService');
const path = require('path');
const fs = require('fs');

// --- TASKS ---
const addTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, priority = 'normal', dueDate } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Task name required' });
    
    const validPriority = ['low', 'normal', 'high'].includes(priority) ? priority : 'normal';

    const { data, error } = await supabase
      .from('tasks')
      .insert({ user_id: userId, name, priority: validPriority, due_date: dueDate || null })
      .select()
      .single();

    if (error) throw error;
    res.json({
      ok: true,
      task: {
        id: data.id, name: data.name, done: data.done, priority: data.priority,
        dueDate: data.due_date, fileUrl: data.file_url || null, fileName: data.file_name || null,
        archived: data.archived || false
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

    const { data: task } = await supabase
      .from('tasks')
      .select('file_url')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (task?.file_url && typeof task.file_url === 'string' && task.file_url.startsWith('/uploads/')) {
      const uploadsDir = path.normalize(path.join(__dirname, '..', 'uploads'));
      const filePath = path.normalize(path.join(__dirname, '..', task.file_url));
      if (filePath.startsWith(uploadsDir) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to delete task' });
  }
};

const archiveTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !task) return res.status(404).json({ ok: false, error: 'Task not found' });

    const { error } = await supabase
      .from('tasks')
      .update({ archived: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to archive task' });
  }
};

const uploadTaskFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });

    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !task) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }

    const relativeUrl = `/uploads/task-files/${req.file.filename}`;

    const { data: fileRow, error: insertErr } = await supabase
      .from('task_files')
      .insert({ task_id: parseInt(id), file_url: relativeUrl, file_name: req.file.originalname })
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.json({ ok: true, file: { id: fileRow.id, fileUrl: relativeUrl, fileName: req.file.originalname } });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ ok: false, error: 'Failed to upload file' });
  }
};

const getTaskFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: task } = await supabase.from('tasks').select('id').eq('id', id).eq('user_id', userId).single();
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' });

    const { data, error } = await supabase
      .from('task_files')
      .select('id, file_url, file_name, uploaded_at')
      .eq('task_id', parseInt(id))
      .order('uploaded_at', { ascending: true });

    if (error) throw error;
    res.json({ ok: true, files: (data || []).map(f => ({ id: f.id, fileUrl: f.file_url, fileName: f.file_name, uploadedAt: f.uploaded_at })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to get task files' });
  }
};

const deleteTaskFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, fileId } = req.params;

    const { data: task } = await supabase.from('tasks').select('id').eq('id', id).eq('user_id', userId).single();
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' });

    const { data: fileRow } = await supabase.from('task_files').select('file_url').eq('id', fileId).eq('task_id', parseInt(id)).single();
    if (!fileRow) return res.status(404).json({ ok: false, error: 'File not found' });

    if (fileRow.file_url && fileRow.file_url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', fileRow.file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const { error } = await supabase.from('task_files').delete().eq('id', fileId).eq('task_id', parseInt(id));
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to delete task file' });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });

    const { data: pi } = await supabase.from('personal_info').select('avatar_url, name').eq('user_id', userId).single();

    if (pi?.avatar_url && pi.avatar_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', pi.avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const relativeUrl = `/uploads/avatars/${req.file.filename}`;

    const { error } = await supabase
      .from('personal_info')
      .upsert({ user_id: userId, avatar_url: relativeUrl, name: pi?.name || '' }, { onConflict: 'user_id' });

    if (error) throw error;

    res.json({ ok: true, avatarUrl: relativeUrl });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ ok: false, error: 'Failed to upload avatar' });
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
      .insert({ enrollment_id: enrollmentId, course_id: courseId, type, name, max_marks: maxMarks, obtained })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ ok: false, error: 'A component with this name already exists' });
      throw error;
    }
    res.json({
      ok: true,
      component: { id: data.id, type: data.type, name: data.name, maxMarks: data.max_marks, obtained: data.obtained }
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
      component: { id: updated.id, type: updated.type, name: updated.name, maxMarks: updated.max_marks, obtained: updated.obtained }
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

// --- ACADEMIC HIERARCHY / INSTITUTIONS ---
const getInstitutions = async (req, res) => {
  try {
    const hierarchy = await academicHierarchyService.getFullHierarchy();
    res.json({
      ok: true,
      ...hierarchy
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

    const { data: batch } = await supabase.from('batches').select('cr_user_id').eq('id', batchId).single();
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
      .eq('user_id', userId)
      .single();

    const { data: userRow } = await supabase.from('users').select('role').eq('id', userId).single();
    
    let uniName = null;
    if (userRow?.role === 'university_moderator') {
      const { data: mod } = await supabase.from('university_moderators').select('universities(university_name)').eq('user_id', userId).single();
      if (mod) uniName = mod.universities?.university_name;
    }

    res.json({
      ok: true,
      role: userRow?.role,
      uniName,
      personal: personal || {},
      academic: academicHierarchyService.formatAcademicObject(academic)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, data } = req.body;

    if (type === 'personal') {
      const { name, father_name, mother_name, contact_no, address } = data;
      const { error } = await supabase
        .from('personal_info')
        .upsert({ user_id: userId, name, father_name, mother_name, contact_no, address }, { onConflict: 'user_id' });

      if (error) throw error;
    } else if (type === 'academic') {
      const { reg_no } = data;
      const { error } = await supabase.from('academic_info').update({ reg_no }).eq('user_id', userId);
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

    const { data: academic } = await supabase.from('academic_info').select('batch_id').eq('user_id', userId).single();
    if (!academic?.batch_id) return res.status(400).json({ ok: false, error: 'No batch found for user' });

    const batchId = academic.batch_id;

    const { data: batchRow } = await supabase.from('batches').select('cr_user_id').eq('id', batchId).single();

    const { data: members, error } = await supabase
      .from('academic_info')
      .select('user_id, reg_no, users!academic_info_user_id_fkey(personal_info(name, avatar_url))')
      .eq('batch_id', batchId);

    if (error) throw error;

    const crUserId = batchRow?.cr_user_id;

    const formatted = (members || []).map(m => {
      const pi = Array.isArray(m.users?.personal_info) ? m.users.personal_info[0] : m.users?.personal_info;
      return {
        userId: m.user_id,
        name: pi?.name || 'Unknown',
        avatarUrl: pi?.avatar_url || null,
        regNo: m.reg_no,
        isCR: m.user_id === crUserId
      };
    });

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
  addTask, toggleTask, deleteTask, archiveTask,
  uploadTaskFile, getTaskFiles, deleteTaskFile, uploadAvatar,
  addComponent, updateComponent, deleteComponent,
  getInstitutions, joinBatch,
  getProfile, updateProfile,
  getMyBatchMembers
};
