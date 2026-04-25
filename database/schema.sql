-- ============================================================
--  StudyEase — Database Schema v4.0
--  MySQL 5.7+ / MariaDB 10.2+
--
--  Key corrections from v3:
--    • departments   → dept_id PK (auto); UNIQUE(dept_code, uni_code)
--    • batches       → uses dept_id FK; uni_code removed (derived)
--    • courses       → uses dept_id FK; uni_code removed; UNIQUE(course_code, dept_id)
--    • academic_info → uses dept_id FK; uni_code removed (derived)
--    • student_enrollments → semester removed (no semester system)
--    • updated_at    → NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
--    • batch_join_requests → new table for student approval flow
--    • Admin has full control incl. CR assignment
--    • CR manages courses + student participation
--    • University Moderator manages departments + batches
--
--  Creation order (FK dependencies respected):
--     1. universities          9. user_roles_history
--     2. users                10. batch_join_requests
--     3. departments          11. student_enrollments
--     4. university_moderators 12. grade_components
--     5. batches              13. exams
--     6. courses              14. tasks
--     7. personal_info        15. notices
--     8. academic_info
-- ============================================================

CREATE DATABASE IF NOT EXISTS studyease
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE studyease;

-- ─────────────────────────────────────────────────────────────
--  1. universities
-- ─────────────────────────────────────────────────────────────
CREATE TABLE universities (
  uni_code  VARCHAR(20)  NOT NULL,
  uni_name  VARCHAR(255) NOT NULL,
  PRIMARY KEY (uni_code)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  2. users
--  Role hierarchy (all enforced in backend):
--    admin              → full control; assigns moderators & CRs
--    university_moderator → creates departments & batches
--    cr                 → manages courses & student participation
--    student            → default role
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student','cr','university_moderator','admin')
                NOT NULL DEFAULT 'student',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME     NULL     COMMENT 'Soft delete — NULL means active'
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  3. departments
--  FIX: dept_id is the PK (auto_increment).
--       dept_code is unique only within a university.
--       All FK references use dept_id, not dept_code.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE departments (
  dept_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dept_code VARCHAR(20)  NOT NULL,
  dept_name VARCHAR(255) NOT NULL,
  uni_code  VARCHAR(20)  NOT NULL,
  UNIQUE KEY uq_dept_code_uni (dept_code, uni_code),
  FOREIGN KEY (uni_code) REFERENCES universities(uni_code) ON DELETE CASCADE,
  INDEX idx_dept_uni (uni_code)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  4. university_moderators
--  Maps users to universities where they act as moderators.
--  Admin-only insert/update (backend enforced).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE university_moderators (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  uni_code   VARCHAR(20)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mod_uni (user_id, uni_code),
  FOREIGN KEY (user_id)  REFERENCES users(id)              ON DELETE CASCADE,
  FOREIGN KEY (uni_code) REFERENCES universities(uni_code) ON DELETE CASCADE,
  INDEX idx_mod_uni (uni_code)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  5. batches
--  FIX: uses dept_id FK (uni_code removed — derived via dept).
--       Duplicate batch names are allowed (no unique constraint).
--       cr_user_id UNIQUE: one user can be CR of only one batch.
--       Multiple NULLs are allowed in MySQL UNIQUE — backend
--       ensures correct assignment.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE batches (
  batch_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_name VARCHAR(100) NOT NULL COMMENT 'e.g. 2021-2025',
  dept_id    INT UNSIGNED NOT NULL,
  cr_user_id INT UNSIGNED NULL UNIQUE
             COMMENT 'One CR per batch; NULL = unassigned',
  FOREIGN KEY (dept_id)    REFERENCES departments(dept_id) ON DELETE CASCADE,
  FOREIGN KEY (cr_user_id) REFERENCES users(id)            ON DELETE SET NULL,
  INDEX idx_batch_dept (dept_id)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  6. courses
--  FIX: uses dept_id FK (uni_code removed — derived via dept).
--       UNIQUE(course_code, dept_id) — code unique within dept.
--       CR manages courses; admin has full override.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE courses (
  course_id    INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  course_code  VARCHAR(50)   NOT NULL,
  course_name  VARCHAR(255)  NOT NULL,
  batch_id     INT UNSIGNED  NOT NULL,
  credit_hours DECIMAL(3,1)  NOT NULL DEFAULT 3.0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_batch (course_code, batch_id),
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
  INDEX idx_course_batch (batch_id)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  6b. course_files
--  CR uploads lecture notes, assignments, and resources.
--  Students can view/download. No schema change needed on
--  courses itself — files are a separate concern.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE course_files (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  course_id   INT UNSIGNED  NOT NULL,
  uploaded_by INT UNSIGNED  NOT NULL COMMENT 'Must be CR of the batch',
  file_url    VARCHAR(1000) NOT NULL,
  file_name   VARCHAR(255)  NOT NULL,
  file_type   ENUM('lecture','assignment','past_paper','resource','other')
              NOT NULL DEFAULT 'other'
              COMMENT 'Category of the uploaded file',
  uploaded_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id)   REFERENCES courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)          ON DELETE RESTRICT,
  INDEX idx_cf_course    (course_id),
  INDEX idx_cf_uploader  (uploaded_by),
  INDEX idx_cf_type      (file_type)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  7. personal_info  (one-to-one with users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE personal_info (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NULL,
  mother_name VARCHAR(255) NULL,
  contact_no  VARCHAR(20)  NULL,
  address     TEXT         NULL,
  avatar_url  VARCHAR(500) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  8. academic_info  (one-to-one with users)
--  FIX: uses dept_id FK only (uni_code removed — derived via
--       departments.uni_code). Single source of truth.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE academic_info (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL UNIQUE,
  dept_id    INT UNSIGNED NOT NULL
             COMMENT 'uni_code derived via departments.dept_id',
  batch_id   INT UNSIGNED NOT NULL,
  reg_no     VARCHAR(50)  NOT NULL UNIQUE
             COMMENT 'University registration number',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)           ON DELETE CASCADE,
  FOREIGN KEY (dept_id)  REFERENCES departments(dept_id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id)   ON DELETE RESTRICT,
  INDEX idx_acad_dept  (dept_id),
  INDEX idx_acad_batch (batch_id)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
--  9. user_roles_history  (full audit trail — all role changes)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_roles_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  old_role    ENUM('student','cr','university_moderator','admin')
              NULL    COMMENT 'NULL on first assignment',
  new_role    ENUM('student','cr','university_moderator','admin') NOT NULL,
  assigned_by INT UNSIGNED NOT NULL,
  assigned_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_role_user (user_id),
  INDEX idx_role_time (assigned_at)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
-- 10. batch_join_requests
--  Student applies to join a batch → CR approves/rejects →
--  on approval, academic_info is created/updated by backend.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE batch_join_requests (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  batch_id     INT UNSIGNED NOT NULL,
  status       ENUM('pending','approved','rejected')
               NOT NULL DEFAULT 'pending',
  reviewed_by  INT UNSIGNED NULL
               COMMENT 'CR or Admin who reviewed the request',
  message      TEXT         NULL
               COMMENT 'Optional note from the student',
  reg_no       VARCHAR(50)  NULL
               COMMENT 'Student declares intended reg number; CR uses this for verification',
  requested_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at  DATETIME     NULL,
  UNIQUE KEY uq_join_request (user_id, batch_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)          ON DELETE CASCADE,
  FOREIGN KEY (batch_id)    REFERENCES batches(batch_id)  ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)          ON DELETE SET NULL,
  INDEX idx_join_batch  (batch_id),
  INDEX idx_join_status (status)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
-- 11. student_enrollments
--  Links a student to a course within a batch.
--  FIX: semester removed (no semester system).
--       UNIQUE(user_id, course_id) — one enrollment per course.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE student_enrollments (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  course_id  INT UNSIGNED NOT NULL,
  batch_id   INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrollment (user_id, course_id),
  FOREIGN KEY (user_id)   REFERENCES users(id)           ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id)  ON DELETE CASCADE,
  FOREIGN KEY (batch_id)  REFERENCES batches(batch_id)   ON DELETE RESTRICT,
  INDEX idx_enroll_user   (user_id),
  INDEX idx_enroll_course (course_id),
  INDEX idx_enroll_batch  (batch_id)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
-- 12. grade_components
--  Linked to student_enrollments.
--  ENUM type matches UI options. CHECK: obtained ≤ max_marks.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE grade_components (
  id            INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT UNSIGNED  NOT NULL,
  course_id     INT UNSIGNED  NOT NULL,
  type          ENUM('attendance','ct','quiz','assignment',
                     'midterm','final','presentation','other')
                NOT NULL DEFAULT 'other',
  name          VARCHAR(255)  NOT NULL,
  max_marks     DECIMAL(10,2) NOT NULL,
  obtained      DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT chk_obtained_lte_max CHECK (obtained <= max_marks),
  UNIQUE KEY uq_gc_name (enrollment_id, name)
             COMMENT 'Prevents duplicate component names in the same course enrollment',
  FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)     REFERENCES courses(course_id)      ON DELETE CASCADE,
  INDEX idx_gc_enrollment (enrollment_id),
  INDEX idx_gc_course     (course_id)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
-- 13. exams  (CR-controlled — linked to course + batch)
--  Removed: user_id (students do not create exams)
--  Added:   course_id, batch_id, created_by
-- ─────────────────────────────────────────────────────────────
CREATE TABLE exams (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id  INT UNSIGNED NOT NULL,
  batch_id   INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL COMMENT 'CR who created the exam',
  name       VARCHAR(255) NOT NULL,
  exam_date  DATE         NOT NULL,
  exam_time  TIME         NULL,
  venue      VARCHAR(255) NULL,
  notes      TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id)  REFERENCES courses(course_id)  ON DELETE CASCADE,
  FOREIGN KEY (batch_id)   REFERENCES batches(batch_id)   ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)           ON DELETE RESTRICT,
  INDEX idx_exams_course (course_id),
  INDEX idx_exams_batch  (batch_id),
  INDEX idx_exams_date   (exam_date)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
-- 14. tasks  (personal — user_id FK unchanged)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  name       VARCHAR(500) NOT NULL,
  done       TINYINT(1)   NOT NULL DEFAULT 0,
  priority   ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  due_date   DATE         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tasks_user (user_id),
  INDEX idx_tasks_due  (due_date)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────
-- 15. notices
--  CR-controlled, batch-scoped communication hub.
--  posted_by = name snapshot at post time (intentional).
--  batch_id NOT NULL — every notice belongs to exactly one batch.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notices (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(500) NOT NULL,
  description       TEXT         NOT NULL,
  category          ENUM('general','exam','assignment','event','holiday','urgent')
                    NOT NULL DEFAULT 'general',
  priority          ENUM('general','low','medium','high')
                    NOT NULL DEFAULT 'general',
  posted_by         VARCHAR(255) NOT NULL
                    COMMENT 'Name snapshot at post time — intentional denormalization',
  posted_by_user_id INT UNSIGNED NULL,
  batch_id          INT UNSIGNED NOT NULL
                    COMMENT 'Every notice belongs to exactly one batch',
  is_pinned         TINYINT(1)   NOT NULL DEFAULT 0,
  attachment_url    VARCHAR(500) NULL,
  expires_at        DATETIME     NULL,
  posted_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by_user_id) REFERENCES users(id)          ON DELETE SET NULL,
  FOREIGN KEY (batch_id)          REFERENCES batches(batch_id)  ON DELETE RESTRICT,
  INDEX idx_notices_posted  (posted_at),
  INDEX idx_notices_pinned  (is_pinned),
  INDEX idx_notices_expires (expires_at),
  INDEX idx_notices_batch   (batch_id)
) ENGINE=InnoDB;
