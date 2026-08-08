const { supabase } = require('../supabaseClient');
const path = require('path');

const getCRBatch = async (userId) => {
  const { data: academic } = await supabase.from('academic_info').select('batch_id, department_id').eq('user_id', userId).single();
  if (!academic) throw new Error('No batch found');
  return academic;
};

const listRequests = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    
    const { data: requests, error } = await supabase
      .from('batch_join_requests')
      .select(`
        id, user_id, reg_no, message, requested_at,
        users!batch_join_requests_user_id_fkey(email, personal_info(name))
      `)
      .eq('batch_id', academic.batch_id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) throw error;

    const formatted = requests.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.users?.personal_info?.name,
      email: r.users?.email,
      regNo: r.reg_no,
      message: r.message,
      requestedAt: r.requested_at
    }));

    res.json({ ok: true, requests: formatted });
  } catch (err) {
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const reviewRequest = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { requestId, status } = req.body;

    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ ok: false, error: 'Invalid status' });

    const { data: reqData } = await supabase
      .from('batch_join_requests')
      .select('user_id, reg_no')
      .eq('id', requestId)
      .eq('batch_id', academic.batch_id)
      .eq('status', 'pending')
      .single();

    if (!reqData) return res.status(404).json({ ok: false, error: 'Pending request not found' });

    await supabase.from('batch_join_requests').update({
      status,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);

    if (status === 'approved') {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_batch_join_request_transactional', {
        p_request_id: requestId,
        p_reviewer_id: req.user.id
      });

      if (!rpcErr && rpcRes) {
        if (!rpcRes.ok) return res.status(400).json(rpcRes);
        return res.json({ ok: true });
      }

      await supabase.from('academic_info').upsert({
        user_id: reqData.user_id,
        department_id: academic.department_id,
        batch_id: academic.batch_id,
        reg_no: reqData.reg_no || `REG_${reqData.user_id.substring(0, 8)}`
      }, { onConflict: 'user_id' });

      const { data: batchCourses } = await supabase
        .from('courses')
        .select('course_id')
        .eq('batch_id', academic.batch_id);

      if (batchCourses && batchCourses.length > 0) {
        const enrollsToInsert = batchCourses.map(c => ({
          user_id: reqData.user_id,
          course_id: c.course_id,
          batch_id: academic.batch_id
        }));
        await supabase.from('student_enrollments').upsert(enrollsToInsert, { onConflict: 'user_id,course_id' });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('reviewRequest error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: 'Failed to review request' });
  }
};

const addCourse = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { courseCode, courseName, creditHours = 3.0 } = req.body;

    if (!courseCode || !courseName) return res.status(400).json({ ok: false, error: 'Code and Name required' });

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_course_with_enrollments_transactional', {
      p_course_code: courseCode,
      p_course_name: courseName,
      p_batch_id: academic.batch_id,
      p_credit_hours: parseFloat(creditHours) || 3.0
    });

    if (!rpcErr && rpcRes) {
      if (rpcRes.error) return res.status(400).json(rpcRes);
      return res.json(rpcRes);
    }

    let { data: course } = await supabase
      .from('courses')
      .select('course_id')
      .eq('course_code', courseCode)
      .eq('batch_id', academic.batch_id)
      .single();

    let courseId;
    if (!course) {
      const { data: newCourse, error } = await supabase
        .from('courses')
        .insert({
          course_code: courseCode,
          course_name: courseName,
          batch_id: academic.batch_id,
          credit_hours: creditHours
        }).select().single();
      
      if (error) throw error;
      courseId = newCourse.course_id;
    } else {
      courseId = course.course_id;
    }

    const { data: students } = await supabase.from('academic_info').select('user_id').eq('batch_id', academic.batch_id);
    if (students && students.length > 0) {
      const enrolls = students.map(s => ({
        user_id: s.user_id,
        course_id: courseId,
        batch_id: academic.batch_id
      }));
      await supabase.from('student_enrollments').upsert(enrolls, { onConflict: 'user_id,course_id' });
    }

    res.json({ ok: true, courseId });
  } catch (err) {
    console.error('addCourse error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: 'Failed to add course' });
  }
};

const addExam = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { courseId, name, date, time, venue, notes } = req.body;

    if (!courseId || !name || !date) return res.status(400).json({ ok: false, error: 'Course, Name, and Date required' });

    const { data: course } = await supabase.from('courses').select('course_id').eq('course_id', courseId).eq('batch_id', academic.batch_id).single();
    if (!course) return res.status(400).json({ ok: false, error: 'Invalid course' });

    const { data, error } = await supabase.from('exams').insert({
      course_id: courseId,
      batch_id: academic.batch_id,
      created_by: req.user.id,
      name,
      exam_date: date,
      exam_time: time || null,
      venue: venue || null,
      notes: notes || null
    }).select().single();

    if (error) throw error;

    const { data: members } = await supabase.from('academic_info').select('user_id').eq('batch_id', academic.batch_id);
    if (members && members.length > 0) {
      const notifs = members.map(m => ({
        user_id: m.user_id,
        title: 'New Exam Scheduled',
        message: `An exam "${name}" has been scheduled for ${date}.`,
        type: 'new_exam'
      }));
      await supabase.from('notifications').insert(notifs);
    }

    res.json({ ok: true, examId: data.id });
  } catch (err) {
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { id } = req.params;
    const { courseCode, courseName, creditHours } = req.body;
    
    const { data: course } = await supabase.from('courses').select('course_id').eq('course_id', id).eq('batch_id', academic.batch_id).single();
    if (!course) return res.status(403).json({ ok: false, error: 'Unauthorized' });

    const { data, error } = await supabase.from('courses').update({
      course_code: courseCode,
      course_name: courseName,
      credit_hours: creditHours
    }).eq('course_id', id).select().single();
    
    if (error) throw error;
    res.json({ ok: true, course: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { id } = req.params;
    const { error } = await supabase.from('courses').delete().eq('course_id', id).eq('batch_id', academic.batch_id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const addCourseMaterial = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { courseId } = req.params;
    const { fileName, fileType = 'other' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'File is required' });
    }

    if (!fileName) {
      return res.status(400).json({ ok: false, error: 'File name is required' });
    }

    const ext = path.extname(req.file.originalname);
    let finalFileName = fileName;
    if (ext && !finalFileName.endsWith(ext)) {
      finalFileName += ext;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const { data: course } = await supabase.from('courses').select('course_id').eq('course_id', courseId).eq('batch_id', academic.batch_id).single();
    if (!course) return res.status(400).json({ ok: false, error: 'Invalid course' });

    const { data, error } = await supabase.from('course_files').insert({
      course_id: courseId,
      uploaded_by: req.user.id,
      file_name: finalFileName,
      file_url: fileUrl,
      file_type: fileType
    }).select().single();

    if (error) throw error;
    
    const { data: members } = await supabase.from('academic_info').select('user_id').eq('batch_id', academic.batch_id);
    if (members && members.length > 0) {
      const notifs = members.map(m => ({
        user_id: m.user_id,
        title: 'New Course Material',
        message: `New material "${fileName}" added for course ID ${courseId}.`,
        type: 'new_material'
      }));
      await supabase.from('notifications').insert(notifs);
    }

    res.json({ ok: true, material: { id: data.id, courseId: data.course_id, name: data.file_name, url: data.file_url, type: data.file_type } });
  } catch (err) {
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const deleteCourseMaterial = async (req, res) => {
  try {
    await getCRBatch(req.user.id);
    const { id } = req.params;
    
    const { error } = await supabase.from('course_files').delete().eq('id', id).eq('uploaded_by', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const updateExam = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { id } = req.params;
    const { courseId, name, date, time, venue, notes } = req.body;
    const { data, error } = await supabase.from('exams').update({
      course_id: courseId,
      name,
      exam_date: date,
      exam_time: time || null,
      venue: venue || null,
      notes: notes || null
    }).eq('id', id).eq('batch_id', academic.batch_id).select().single();
    if (error) throw error;
    res.json({ ok: true, exam: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const deleteExam = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { id } = req.params;
    const { error } = await supabase.from('exams').delete().eq('id', id).eq('batch_id', academic.batch_id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const addNotice = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { title, description, category = 'general', priority = 'general', isPinned = false, attachmentUrl } = req.body;

    if (!title || !description) return res.status(400).json({ ok: false, error: 'Title and description required' });

    const { data: pi } = await supabase.from('personal_info').select('name').eq('user_id', req.user.id).single();

    const { error } = await supabase.from('notices').insert({
      title,
      description,
      category,
      priority,
      posted_by: pi?.name || 'CR',
      posted_by_user_id: req.user.id,
      batch_id: academic.batch_id,
      is_pinned: isPinned,
      attachment_url: attachmentUrl || null
    });

    if (error) throw error;

    const { data: members } = await supabase.from('academic_info').select('user_id').eq('batch_id', academic.batch_id);
    if (members && members.length > 0) {
      const notifs = members.map(m => ({
        user_id: m.user_id,
        title: 'New Notice Posted',
        message: `A new notice "${title}" was posted by your CR.`,
        type: 'new_notice'
      }));
      await supabase.from('notifications').insert(notifs);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const updateNotice = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { id } = req.params;
    const { title, description, category, priority, isPinned } = req.body;
    
    const { data, error } = await supabase.from('notices').update({
      title,
      description,
      category,
      priority,
      is_pinned: isPinned
    }).eq('id', id).eq('batch_id', academic.batch_id).select().single();
    
    if (error) throw error;
    res.json({ ok: true, notice: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const deleteNotice = async (req, res) => {
  try {
    await getCRBatch(req.user.id);
    const { id } = req.params;

    const { error } = await supabase.from('notices').delete().eq('id', id).eq('posted_by_user_id', req.user.id);
    if (error) throw error;
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const getBatchData = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const batchId = academic.batch_id;

    const today = new Date().toISOString().split('T')[0];

    const [coursesRes, examsRes, noticesRes] = await Promise.all([
      supabase.from('courses').select('course_id, course_code, course_name, credit_hours').eq('batch_id', batchId).order('course_code'),
      supabase.from('exams').select('id, name, exam_date, exam_time, venue, notes, course_id, courses(course_code)').eq('batch_id', batchId).gte('exam_date', today).order('exam_date', { ascending: true }),
      supabase.from('notices').select('id, title, description, category, priority, is_pinned, posted_at').eq('batch_id', batchId).order('posted_at', { ascending: false })
    ]);

    let courseFiles = [];
    if (coursesRes.data && coursesRes.data.length > 0) {
      const courseIds = coursesRes.data.map(c => c.course_id);
      const { data: fileData } = await supabase
        .from('course_files')
        .select('id, course_id, file_name, file_url, file_type')
        .in('course_id', courseIds);

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

    res.json({
      ok: true,
      courses: coursesRes.data || [],
      exams: (examsRes.data || []).map(e => ({
        id: e.id, name: e.name, date: e.exam_date, time: e.exam_time,
        venue: e.venue, notes: e.notes, courseId: e.course_id,
        courseCode: e.courses?.course_code
      })),
      notices: (noticesRes.data || []).map(n => ({
        id: n.id, title: n.title, description: n.description,
        category: n.category, priority: n.priority,
        isPinned: n.is_pinned, postedAt: n.posted_at
      })),
      courseFiles
    });
  } catch (err) {
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const getBatchMembers = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
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
    console.error('getBatchMembers error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

const removeStudent = async (req, res) => {
  try {
    const academic = await getCRBatch(req.user.id);
    const { studentId } = req.params;

    const { data: studentAca } = await supabase
      .from('academic_info')
      .select('batch_id')
      .eq('user_id', studentId)
      .single();

    if (!studentAca || studentAca.batch_id !== academic.batch_id) {
      return res.status(403).json({ ok: false, error: 'Student is not in your batch' });
    }

    const { error } = await supabase.from('academic_info').delete().eq('user_id', studentId);
    if (error) throw error;

    await supabase
      .from('batch_join_requests')
      .update({ status: 'rejected', message: 'SYSTEM:REMOVED' })
      .eq('user_id', studentId)
      .eq('batch_id', academic.batch_id);

    res.json({ ok: true, message: 'Student removed from batch' });
  } catch (err) {
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ ok: false, error: err.message });
  }
};

module.exports = {
  listRequests, reviewRequest,
  addCourse, updateCourse, deleteCourse,
  addCourseMaterial, deleteCourseMaterial,
  addExam, updateExam, deleteExam,
  addNotice, updateNotice, deleteNotice,
  getBatchData, getBatchMembers,
  removeStudent
};
