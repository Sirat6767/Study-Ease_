-- ============================================================
--  StudyEase — Supabase PostgreSQL Schema
--  This replaces the old MySQL schema.
-- ============================================================

-- 0. Drop existing tables and types to allow re-running the script
DROP TABLE IF EXISTS notices, tasks, exams, grade_components, student_enrollments, batch_join_requests, user_roles_history, academic_info, personal_info, course_files, courses, batches, university_moderators, departments, users, universities CASCADE;
DROP TYPE IF EXISTS user_role, batch_join_status, file_type_enum, grade_component_type, task_priority, notice_category, notice_priority CASCADE;

-- 1. Custom Types
CREATE TYPE user_role AS ENUM('student', 'cr', 'university_moderator', 'admin');
CREATE TYPE batch_join_status AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE file_type_enum AS ENUM('lecture', 'assignment', 'past_paper', 'resource', 'other');
CREATE TYPE grade_component_type AS ENUM('attendance', 'ct', 'quiz', 'assignment', 'midterm', 'final', 'presentation', 'other');
CREATE TYPE task_priority AS ENUM('low', 'normal', 'high');
CREATE TYPE notice_category AS ENUM('general', 'exam', 'assignment', 'event', 'holiday', 'urgent');
CREATE TYPE notice_priority AS ENUM('general', 'low', 'medium', 'high');

-- 2. Trigger Function for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Universities
CREATE TABLE universities (
  uni_code  VARCHAR(20) PRIMARY KEY,
  uni_name  VARCHAR(255) NOT NULL
);

-- 4. Users (Extends Supabase auth.users)
-- We use UUID to directly reference Supabase's built-in authentication system.
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  role          user_role NOT NULL DEFAULT 'student',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMP WITH TIME ZONE NULL
);
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 5. Departments
CREATE TABLE departments (
  dept_id   SERIAL PRIMARY KEY,
  dept_code VARCHAR(20) NOT NULL,
  dept_name VARCHAR(255) NOT NULL,
  uni_code  VARCHAR(20) NOT NULL REFERENCES universities(uni_code) ON DELETE CASCADE,
  UNIQUE(dept_code, uni_code)
);

-- 6. University Moderators
CREATE TABLE university_moderators (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uni_code   VARCHAR(20) NOT NULL REFERENCES universities(uni_code) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, uni_code)
);

-- 7. Batches
CREATE TABLE batches (
  batch_id   SERIAL PRIMARY KEY,
  batch_name VARCHAR(100) NOT NULL,
  dept_id    INTEGER NOT NULL REFERENCES departments(dept_id) ON DELETE CASCADE,
  cr_user_id UUID NULL UNIQUE REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Courses
CREATE TABLE courses (
  course_id    SERIAL PRIMARY KEY,
  course_code  VARCHAR(50) NOT NULL,
  course_name  VARCHAR(255) NOT NULL,
  batch_id     INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
  credit_hours DECIMAL(3,1) NOT NULL DEFAULT 3.0,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_code, batch_id)
);
CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 9. Course Files
CREATE TABLE course_files (
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_url    VARCHAR(1000) NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_type   file_type_enum NOT NULL DEFAULT 'other',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Personal Info
CREATE TABLE personal_info (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NULL,
  mother_name VARCHAR(255) NULL,
  contact_no  VARCHAR(20) NULL,
  address     TEXT NULL,
  avatar_url  VARCHAR(500) NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_personal_info_modtime BEFORE UPDATE ON personal_info FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 11. Academic Info
CREATE TABLE academic_info (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dept_id    INTEGER NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
  batch_id   INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE RESTRICT,
  reg_no     VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_academic_info_modtime BEFORE UPDATE ON academic_info FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 12. User Roles History
CREATE TABLE user_roles_history (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_role    user_role NULL,
  new_role    user_role NOT NULL,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. Batch Join Requests
CREATE TABLE batch_join_requests (
  id           SERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id     INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
  status       batch_join_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  message      TEXT NULL,
  reg_no       VARCHAR(50) NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(user_id, batch_id)
);

-- 14. Student Enrollments
CREATE TABLE student_enrollments (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  batch_id   INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 15. Grade Components
CREATE TABLE grade_components (
  id            SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  type          grade_component_type NOT NULL DEFAULT 'other',
  name          VARCHAR(255) NOT NULL,
  max_marks     DECIMAL(10,2) NOT NULL,
  obtained      DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK(obtained <= max_marks),
  UNIQUE(enrollment_id, name)
);

-- 16. Exams
CREATE TABLE exams (
  id         SERIAL PRIMARY KEY,
  course_id  INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  batch_id   INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name       VARCHAR(255) NOT NULL,
  exam_date  DATE NOT NULL,
  exam_time  TIME NULL,
  venue      VARCHAR(255) NULL,
  notes      TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_exams_modtime BEFORE UPDATE ON exams FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 17. Tasks
CREATE TABLE tasks (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(500) NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false,
  priority   task_priority NOT NULL DEFAULT 'normal',
  due_date   DATE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 18. Notices
CREATE TABLE notices (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(500) NOT NULL,
  description       TEXT NOT NULL,
  category          notice_category NOT NULL DEFAULT 'general',
  priority          notice_priority NOT NULL DEFAULT 'general',
  posted_by         VARCHAR(255) NOT NULL,
  posted_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  batch_id          INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE RESTRICT,
  is_pinned         BOOLEAN NOT NULL DEFAULT false,
  attachment_url    VARCHAR(500) NULL,
  expires_at        TIMESTAMP WITH TIME ZONE NULL,
  posted_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TRIGGER update_notices_modtime BEFORE UPDATE ON notices FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Important: Supabase Security Policies (RLS) setup
-- For now, we will enable access. We can refine these later.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update users" ON users FOR ALL USING (auth.role() = 'authenticated');

-- We can do the same for others, but for a backend-driven approach via Service Role Key, RLS isn't strictly necessary.

 - -   1 8 .   N o t i f i c a t i o n s 
 C R E A T E   T A B L E   n o t i f i c a t i o n s   ( 
     i d                   S E R I A L   P R I M A R Y   K E Y , 
     u s e r _ i d         U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E , 
     t i t l e             V A R C H A R ( 2 5 5 )   N O T   N U L L , 
     m e s s a g e         T E X T   N O T   N U L L , 
     t y p e               V A R C H A R ( 5 0 )   N O T   N U L L , 
     i s _ r e a d         B O O L E A N   N O T   N U L L   D E F A U L T   F A L S E , 
     c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   N O T   N U L L   D E F A U L T   n o w ( ) 
 ) ; 
 
 C R E A T E   I N D E X   i d x _ n o t i f i c a t i o n s _ u s e r _ i d   O N   n o t i f i c a t i o n s ( u s e r _ i d ) ; 
  
 