-- ============================================================
--  StudyEase — Supabase PostgreSQL Schema (Consolidated)
--  Last updated: 2026-08-05 (Faculty Level & ID Hierarchy Upgrade)
-- ============================================================

-- 0. Drop existing tables and types to allow re-running the script
DROP TABLE IF EXISTS
  notifications,
  batch_messages,
  task_files,
  notices,
  tasks,
  exams,
  grade_components,
  student_enrollments,
  batch_join_requests,
  user_roles_history,
  academic_info,
  personal_info,
  course_files,
  courses,
  batches,
  university_moderators,
  departments,
  faculties,
  users,
  universities
CASCADE;

DROP TYPE IF EXISTS user_role, batch_join_status, file_type_enum, grade_component_type, task_priority, notice_category, notice_priority CASCADE;

-- ============================================================
-- 1. Custom Types
-- ============================================================
CREATE TYPE user_role            AS ENUM('student', 'cr', 'university_moderator', 'admin');
CREATE TYPE batch_join_status    AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE file_type_enum       AS ENUM('lecture', 'assignment', 'past_paper', 'resource', 'other');
CREATE TYPE grade_component_type AS ENUM('attendance', 'ct', 'quiz', 'assignment', 'midterm', 'final', 'presentation', 'other');
CREATE TYPE task_priority        AS ENUM('low', 'normal', 'high');
CREATE TYPE notice_category      AS ENUM('general', 'exam', 'assignment', 'event', 'holiday', 'urgent');
CREATE TYPE notice_priority      AS ENUM('general', 'low', 'medium', 'high');

-- ============================================================
-- 2. Trigger Function for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- 3. Universities
-- ============================================================
CREATE TABLE universities (
  id              SERIAL PRIMARY KEY,
  university_code VARCHAR(50)  NOT NULL UNIQUE,
  university_name VARCHAR(255) NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE TRIGGER update_universities_modtime
  BEFORE UPDATE ON universities
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 4. Faculties
-- ============================================================
CREATE TABLE faculties (
  id            SERIAL PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  faculty_code  VARCHAR(50) NULL,
  faculty_name  VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(university_id, faculty_name)
);
CREATE TRIGGER update_faculties_modtime
  BEFORE UPDATE ON faculties
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 5. Departments
-- ============================================================
CREATE TABLE departments (
  id              SERIAL PRIMARY KEY,
  faculty_id      INTEGER NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
  department_code VARCHAR(20)  NOT NULL,
  department_name VARCHAR(255) NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(faculty_id, department_name)
);
CREATE TRIGGER update_departments_modtime
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 6. Users (Extends Supabase auth.users)
-- ============================================================
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  role       user_role NOT NULL DEFAULT 'student',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);
CREATE TRIGGER update_users_modtime
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 7. University Moderators
-- ============================================================
CREATE TABLE university_moderators (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, university_id)
);

-- ============================================================
-- 8. Batches
-- ============================================================
CREATE TABLE batches (
  id            SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  batch_name    VARCHAR(100) NOT NULL,
  cr_user_id    UUID NULL UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMP WITH TIME ZONE NULL
);
CREATE TRIGGER update_batches_modtime
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 9. Courses
-- ============================================================
CREATE TABLE courses (
  course_id    SERIAL PRIMARY KEY,
  course_code  VARCHAR(50)  NOT NULL,
  course_name  VARCHAR(255) NOT NULL,
  batch_id     INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  credit_hours DECIMAL(3,1) NOT NULL DEFAULT 3.0,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_code, batch_id)
);
CREATE TRIGGER update_courses_modtime
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 10. Course Files
-- ============================================================
CREATE TABLE course_files (
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  uploaded_by UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_url    VARCHAR(1000) NOT NULL,
  file_name   VARCHAR(255)  NOT NULL,
  file_type   file_type_enum NOT NULL DEFAULT 'other',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. Personal Info
-- ============================================================
CREATE TABLE personal_info (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NULL,
  mother_name VARCHAR(255) NULL,
  contact_no  VARCHAR(20)  NULL,
  address     TEXT NULL,
  avatar_url  VARCHAR(500) NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_personal_info_modtime
  BEFORE UPDATE ON personal_info
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 12. Academic Info
-- ============================================================
CREATE TABLE academic_info (
  id            SERIAL PRIMARY KEY,
  user_id       UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER     NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  batch_id      INTEGER     NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  reg_no        VARCHAR(50) NOT NULL UNIQUE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_academic_info_modtime
  BEFORE UPDATE ON academic_info
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Hierarchy Validation Trigger for academic_info
CREATE OR REPLACE FUNCTION verify_academic_info_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  v_department_id INT;
BEGIN
  SELECT department_id INTO v_department_id FROM batches WHERE id = NEW.batch_id;
  IF v_department_id IS NULL OR v_department_id <> NEW.department_id THEN
    RAISE EXCEPTION 'Hierarchy validation failed: Batch % does not belong to Department %', NEW.batch_id, NEW.department_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_academic_info_hierarchy
  BEFORE INSERT OR UPDATE ON academic_info
  FOR EACH ROW EXECUTE PROCEDURE verify_academic_info_hierarchy();

-- ============================================================
-- 13. User Roles History
-- ============================================================
CREATE TABLE user_roles_history (
  id          SERIAL PRIMARY KEY,
  user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_role    user_role NULL,
  new_role    user_role NOT NULL,
  assigned_by UUID      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. Batch Join Requests
-- ============================================================
CREATE TABLE batch_join_requests (
  id           SERIAL PRIMARY KEY,
  user_id      UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id     INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  status       batch_join_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  message      TEXT NULL,
  reg_no       VARCHAR(50) NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(user_id, batch_id)
);

-- ============================================================
-- 15. Student Enrollments
-- ============================================================
CREATE TABLE student_enrollments (
  id         SERIAL PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  batch_id   INTEGER NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- ============================================================
-- 16. Grade Components
-- ============================================================
CREATE TABLE grade_components (
  id            SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  type          grade_component_type NOT NULL DEFAULT 'other',
  name          VARCHAR(255)  NOT NULL,
  max_marks     DECIMAL(10,2) NOT NULL,
  obtained      DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK(obtained <= max_marks),
  UNIQUE(enrollment_id, name)
);

-- ============================================================
-- 17. Exams
-- ============================================================
CREATE TABLE exams (
  id         SERIAL PRIMARY KEY,
  course_id  INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  batch_id   INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  created_by UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name       VARCHAR(255) NOT NULL,
  exam_date  DATE NOT NULL,
  exam_time  TIME NULL,
  venue      VARCHAR(255) NULL,
  notes      TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_exams_modtime
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 18. Tasks
-- ============================================================
CREATE TABLE tasks (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(500) NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false,
  priority   task_priority NOT NULL DEFAULT 'normal',
  due_date   DATE NULL,
  file_url   VARCHAR(1000) NULL,
  file_name  VARCHAR(255)  NULL,
  archived   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_tasks_modtime
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 19. Task Files
-- ============================================================
CREATE TABLE task_files (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_url    VARCHAR(1000) NOT NULL,
  file_name   VARCHAR(255)  NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_files_task_id ON task_files(task_id);

-- ============================================================
-- 20. Notices
-- ============================================================
CREATE TABLE notices (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(500) NOT NULL,
  description       TEXT NOT NULL,
  category          notice_category NOT NULL DEFAULT 'general',
  priority          notice_priority NOT NULL DEFAULT 'general',
  posted_by         VARCHAR(255) NOT NULL,
  posted_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  batch_id          INTEGER NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  is_pinned         BOOLEAN NOT NULL DEFAULT false,
  attachment_url    VARCHAR(500) NULL,
  expires_at        TIMESTAMP WITH TIME ZONE NULL,
  posted_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_notices_modtime
  BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ============================================================
-- 21. Notifications
-- ============================================================
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  type       VARCHAR(50)  NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ============================================================
-- 22. Batch Messages
-- ============================================================
CREATE TABLE batch_messages (
  id           SERIAL PRIMARY KEY,
  batch_id     INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  sender_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      TEXT    NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_batch_messages_batch_id     ON batch_messages(batch_id);
CREATE INDEX idx_batch_messages_sender_id    ON batch_messages(sender_id);
CREATE INDEX idx_batch_messages_recipient_id ON batch_messages(recipient_id);

-- ============================================================
-- 23. Indexes for Hierarchy Query Optimization
-- ============================================================
CREATE INDEX idx_faculties_university_id ON faculties(university_id);
CREATE INDEX idx_departments_faculty_id  ON departments(faculty_id);
CREATE INDEX idx_batches_department_id   ON batches(department_id);
CREATE UNIQUE INDEX idx_uni_faculty_name  ON faculties(university_id, faculty_name);
CREATE UNIQUE INDEX idx_fac_dept_name     ON departments(faculty_id, department_name);

-- ============================================================
-- 24. Row Level Security (RLS)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read users"              ON users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update users" ON users FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 25. Atomic Transaction RPC Stored Procedures
-- ============================================================

-- 25.1 Approve Batch Join Request Atomic Transaction
CREATE OR REPLACE FUNCTION approve_batch_join_request_transactional(
  p_request_id INT,
  p_reviewer_id UUID
) RETURNS JSON AS $$
DECLARE
  v_req RECORD;
  v_dept_id INT;
BEGIN
  SELECT * INTO v_req FROM batch_join_requests 
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Pending request not found');
  END IF;

  SELECT department_id INTO v_dept_id FROM batches WHERE id = v_req.batch_id;

  UPDATE batch_join_requests 
  SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO academic_info (user_id, department_id, batch_id, reg_no)
  VALUES (v_req.user_id, v_dept_id, v_req.batch_id, COALESCE(v_req.reg_no, 'REG_' || SUBSTRING(v_req.user_id::text FROM 1 FOR 8)))
  ON CONFLICT (user_id) DO UPDATE SET batch_id = EXCLUDED.batch_id, department_id = EXCLUDED.department_id, reg_no = EXCLUDED.reg_no;

  INSERT INTO student_enrollments (user_id, course_id, batch_id)
  SELECT v_req.user_id, course_id, v_req.batch_id
  FROM courses WHERE batch_id = v_req.batch_id
  ON CONFLICT (user_id, course_id) DO NOTHING;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_req.user_id, 'Join Request Approved', 'Your request to join the batch has been approved!', 'request_approved');

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 25.2 Course Creation with Auto-Enrollment Atomic Transaction
CREATE OR REPLACE FUNCTION create_course_with_enrollments_transactional(
  p_course_code VARCHAR,
  p_course_name VARCHAR,
  p_batch_id INT,
  p_credit_hours DECIMAL
) RETURNS JSON AS $$
DECLARE
  v_course_id INT;
BEGIN
  INSERT INTO courses (course_code, course_name, batch_id, credit_hours)
  VALUES (p_course_code, p_course_name, p_batch_id, COALESCE(p_credit_hours, 3.0))
  ON CONFLICT (course_code, batch_id) DO UPDATE SET course_name = EXCLUDED.course_name, credit_hours = EXCLUDED.credit_hours
  RETURNING course_id INTO v_course_id;

  INSERT INTO student_enrollments (user_id, course_id, batch_id)
  SELECT user_id, v_course_id, p_batch_id
  FROM academic_info WHERE batch_id = p_batch_id
  ON CONFLICT (user_id, course_id) DO NOTHING;

  RETURN json_build_object('ok', true, 'courseId', v_course_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 25.3 Role Assignment Atomic Transaction
CREATE OR REPLACE FUNCTION assign_user_role_transactional(
  p_target_user_id UUID,
  p_role user_role,
  p_batch_id INT,
  p_university_id INT,
  p_assigned_by UUID
) RETURNS JSON AS $$
DECLARE
  v_old_role user_role;
  v_old_cr_id UUID;
  v_dept_id INT;
  v_reg_no VARCHAR;
BEGIN
  SELECT role INTO v_old_role FROM users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Target user not found');
  END IF;

  UPDATE users SET role = p_role WHERE id = p_target_user_id;

  INSERT INTO user_roles_history (user_id, old_role, new_role, assigned_by)
  VALUES (p_target_user_id, v_old_role, p_role, p_assigned_by);

  IF p_role IN ('cr', 'student') THEN
    IF p_role = 'cr' THEN
      SELECT cr_user_id INTO v_old_cr_id FROM batches WHERE id = p_batch_id;
      IF v_old_cr_id IS NOT NULL AND v_old_cr_id <> p_target_user_id THEN
        UPDATE users SET role = 'student' WHERE id = v_old_cr_id;
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (v_old_cr_id, 'Role Updated', 'You have been demoted to STUDENT because a new Class Representative was assigned to your batch.', 'role_change');
      END IF;

      UPDATE batches SET cr_user_id = p_target_user_id WHERE id = p_batch_id;
    END IF;

    SELECT department_id INTO v_dept_id FROM batches WHERE id = p_batch_id;
    SELECT reg_no INTO v_reg_no FROM batch_join_requests WHERE user_id = p_target_user_id ORDER BY requested_at DESC LIMIT 1;
    IF v_reg_no IS NULL THEN
      v_reg_no := 'REG_' || SUBSTRING(p_target_user_id::text FROM 1 FOR 8);
    END IF;

    INSERT INTO academic_info (user_id, department_id, batch_id, reg_no)
    VALUES (p_target_user_id, v_dept_id, p_batch_id, v_reg_no)
    ON CONFLICT (user_id) DO UPDATE SET batch_id = EXCLUDED.batch_id, department_id = EXCLUDED.department_id;

    UPDATE batch_join_requests SET status = 'approved', reviewed_by = p_assigned_by, reviewed_at = now()
    WHERE user_id = p_target_user_id AND batch_id = p_batch_id;

  ELSIF p_role = 'university_moderator' THEN
    DELETE FROM university_moderators WHERE user_id = p_target_user_id;
    INSERT INTO university_moderators (user_id, university_id) VALUES (p_target_user_id, p_university_id);
  END IF;

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;