const { supabaseAdmin: supabase } = require('../supabaseClient');

/**
 * Academic Hierarchy Service
 * Centralizes all 4-tier traversal, scoping, validation, and object formatting.
 * Hierarchy: University (id) -> Faculty (university_id) -> Department (faculty_id) -> Batch (department_id)
 */

/**
 * Returns the entire active academic hierarchy in a single parallel payload.
 * Supports dual-schema column aliases (dept_id/id, dept_code/department_code) for complete remote DB resilience.
 */
const getFullHierarchy = async () => {
  const [uniRes, facRes, deptRes, batchRes] = await Promise.all([
    supabase.from('universities').select('*').is('deleted_at', null),
    supabase.from('faculties').select('*').is('deleted_at', null),
    supabase.from('departments').select('*').is('deleted_at', null),
    supabase.from('batches').select('*').is('deleted_at', null)
  ]);

  return {
    universities: (uniRes.data || []).map(u => ({
      id: u.id || u.university_id,
      university_code: u.university_code || u.uni_code,
      university_name: u.university_name || u.uni_name,
      code: u.university_code || u.uni_code,
      name: u.university_name || u.uni_name
    })),
    faculties: (facRes.data || []).map(f => ({
      id: f.id || f.faculty_id,
      university_id: f.university_id,
      faculty_code: f.faculty_code || f.code,
      faculty_name: f.faculty_name || f.name,
      code: f.faculty_code || f.code,
      name: f.faculty_name || f.name
    })),
    departments: (deptRes.data || []).map(d => ({
      id: d.id || d.dept_id,
      faculty_id: d.faculty_id,
      department_code: d.department_code || d.dept_code,
      department_name: d.department_name || d.dept_name,
      code: d.department_code || d.dept_code,
      name: d.department_name || d.dept_name
    })),
    batches: (batchRes.data || []).map(b => ({
      id: b.id || b.batch_id,
      department_id: b.department_id || b.dept_id,
      batch_name: b.batch_name || b.name,
      cr_user_id: b.cr_user_id,
      name: b.batch_name || b.name
    }))
  };
};

/**
 * Formats a raw academic join row into a clean, structured academic object.
 */
const formatAcademicObject = (academicRow) => {
  if (!academicRow) return null;

  const dept = academicRow.departments || {};
  const fac  = dept.faculties || {};
  const uni  = fac.universities || {};
  const batch = academicRow.batches || {};

  return {
    university: {
      id: uni.id || uni.university_id || null,
      code: uni.university_code || uni.uni_code || null,
      name: uni.university_name || uni.uni_name || null
    },
    faculty: {
      id: fac.id || fac.faculty_id || null,
      code: fac.faculty_code || fac.code || null,
      name: fac.faculty_name || fac.name || null
    },
    department: {
      id: dept.id || dept.dept_id || null,
      code: dept.department_code || dept.dept_code || null,
      name: dept.department_name || dept.dept_name || null
    },
    batch: {
      id: batch.id || batch.batch_id || academicRow.batch_id || null,
      name: batch.batch_name || batch.name || null
    },
    regNo: academicRow.reg_no || null
  };
};

/**
 * Validates that a batch belongs to a specific department.
 */
const validateBatchDepartment = async (batchId, departmentId) => {
  if (!batchId || !departmentId) return false;
  const { data: batch } = await supabase
    .from('batches')
    .select('*')
    .or(`id.eq.${batchId},batch_id.eq.${batchId}`)
    .is('deleted_at', null)
    .maybeSingle();
  const dId = batch ? (batch.department_id || batch.dept_id) : null;
  return dId && String(dId) === String(departmentId);
};

/**
 * Validates that a department belongs to a specific faculty.
 */
const validateDepartmentFaculty = async (departmentId, facultyId) => {
  if (!departmentId || !facultyId) return false;
  const { data: dept } = await supabase
    .from('departments')
    .select('*')
    .or(`id.eq.${departmentId},dept_id.eq.${departmentId}`)
    .is('deleted_at', null)
    .maybeSingle();
  return dept && String(dept.faculty_id) === String(facultyId);
};

/**
 * Validates that a faculty belongs to a specific university.
 */
const validateFacultyUniversity = async (facultyId, universityId) => {
  if (!facultyId || !universityId) return false;
  const { data: fac } = await supabase
    .from('faculties')
    .select('*')
    .or(`id.eq.${facultyId},faculty_id.eq.${facultyId}`)
    .is('deleted_at', null)
    .maybeSingle();
  return fac && String(fac.university_id) === String(universityId);
};

/**
 * Validates complete 4-tier chain: University -> Faculty -> Department -> Batch.
 */
const validateFullChain = async (universityId, facultyId, departmentId, batchId) => {
  if (!universityId || !facultyId || !departmentId || !batchId) return false;

  const validBatchDept = await validateBatchDepartment(batchId, departmentId);
  if (!validBatchDept) return false;

  const validDeptFac = await validateDepartmentFaculty(departmentId, facultyId);
  if (!validDeptFac) return false;

  const validFacUni = await validateFacultyUniversity(facultyId, universityId);
  return validFacUni;
};

/**
 * Returns the university ID scope for a moderator or admin.
 */
const getModeratorScope = async (userId, role) => {
  if (role === 'admin') return { isAdmin: true, universityId: null };

  const { data: mod } = await supabase
    .from('university_moderators')
    .select('university_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!mod) throw new Error('No university assigned to this moderator');
  return { universityId: mod.university_id, isAdmin: false };
};

/**
 * Asserts that a batch belongs to the specified university ID.
 */
const assertBatchOwnership = async (batchId, universityId, isAdmin) => {
  if (isAdmin) return;
  const { data: batch } = await supabase
    .from('batches')
    .select('*')
    .or(`id.eq.${batchId},batch_id.eq.${batchId}`)
    .is('deleted_at', null)
    .maybeSingle();

  const deptId = batch ? (batch.department_id || batch.dept_id) : null;
  if (!deptId) throw new Error('Forbidden');

  await assertDepartmentOwnership(deptId, universityId, isAdmin);
};

/**
 * Asserts that a department belongs to the specified university ID.
 */
const assertDepartmentOwnership = async (departmentId, universityId, isAdmin) => {
  if (isAdmin) return;
  const { data: dept } = await supabase
    .from('departments')
    .select('*')
    .or(`id.eq.${departmentId},dept_id.eq.${departmentId}`)
    .is('deleted_at', null)
    .maybeSingle();

  if (!dept) throw new Error('Forbidden');
  await assertFacultyOwnership(dept.faculty_id, universityId, isAdmin);
};

/**
 * Asserts that a faculty belongs to the specified university ID.
 */
const assertFacultyOwnership = async (facultyId, universityId, isAdmin) => {
  if (isAdmin) return;
  const { data: fac } = await supabase
    .from('faculties')
    .select('*')
    .or(`id.eq.${facultyId},faculty_id.eq.${facultyId}`)
    .is('deleted_at', null)
    .maybeSingle();

  if (!fac || String(fac.university_id) !== String(universityId)) {
    throw new Error('Forbidden');
  }
};

module.exports = {
  getFullHierarchy,
  formatAcademicObject,
  validateBatchDepartment,
  validateDepartmentFaculty,
  validateFacultyUniversity,
  validateFullChain,
  getModeratorScope,
  assertBatchOwnership,
  assertDepartmentOwnership,
  assertFacultyOwnership
};
