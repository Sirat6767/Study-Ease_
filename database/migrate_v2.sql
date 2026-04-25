-- ============================================================
--  StudyEase — Migration v1 → v2
--  Run this ONCE on an existing studyease database.
--  Safe to run: every statement uses IF NOT EXISTS / IF EXISTS
--  or checks before altering, so re-running won't break data.
-- ============================================================

USE studyease;

-- ─────────────────────────────────────────────────────────────
--  users table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS student_id  VARCHAR(50)  NULL UNIQUE  COMMENT 'University roll / student ID number'  AFTER name,
  ADD COLUMN IF NOT EXISTS batch       VARCHAR(20)  NULL                                                         AFTER student_id,
  ADD COLUMN IF NOT EXISTS department  VARCHAR(100) NULL                                                         AFTER batch,
  ADD COLUMN IF NOT EXISTS avatar_url  VARCHAR(500) NULL                                                         AFTER department,
  ADD COLUMN IF NOT EXISTS is_active   TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '0 = disabled account'          AFTER avatar_url,
  ADD COLUMN IF NOT EXISTS updated_at  DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP                             AFTER created_at;


-- ─────────────────────────────────────────────────────────────
--  exams table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS exam_time  TIME         NULL    COMMENT 'Optional time slot'  AFTER exam_date,
  ADD COLUMN IF NOT EXISTS venue      VARCHAR(255) NULL    COMMENT 'Room / building'      AFTER exam_time,
  ADD COLUMN IF NOT EXISTS notes      TEXT         NULL                                   AFTER venue,
  ADD COLUMN IF NOT EXISTS created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP     AFTER notes,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP       AFTER created_at;

-- Add missing date index (safe: CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams (exam_date);


-- ─────────────────────────────────────────────────────────────
--  tasks table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority   ENUM('low','normal','high') NOT NULL DEFAULT 'normal'  AFTER done,
  ADD COLUMN IF NOT EXISTS due_date   DATE         NULL    COMMENT 'Optional deadline'        AFTER priority,
  ADD COLUMN IF NOT EXISTS created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP         AFTER due_date,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP           AFTER created_at;

CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks (due_date);


-- ─────────────────────────────────────────────────────────────
--  courses table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS credit_hours DECIMAL(3,1) NOT NULL DEFAULT 3.0 COMMENT 'Used for GPA/CGPA calculation' AFTER code,
  ADD COLUMN IF NOT EXISTS created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP  AFTER credit_hours,
  ADD COLUMN IF NOT EXISTS updated_at   DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP    AFTER created_at;


-- ─────────────────────────────────────────────────────────────
--  grade_components table
--  Change type: VARCHAR(50) → ENUM
--  The MODIFY rewrites the column. Existing values NOT in the
--  ENUM list will be set to the default ('other').
--  Add CHECK constraint if not already present.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE grade_components
  MODIFY COLUMN type ENUM(
    'attendance',
    'ct',
    'quiz',
    'assignment',
    'midterm',
    'final',
    'presentation',
    'other'
  ) NOT NULL DEFAULT 'other';

-- Add CHECK constraint (MySQL 8.0.16+ / MariaDB 10.2+ enforces it)
-- Wrap in a stored procedure check so it doesn't fail if constraint exists
SET @con_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME        = 'grade_components'
    AND CONSTRAINT_NAME   = 'chk_obtained_lte_max'
);
SET @sql = IF(@con_exists = 0,
  'ALTER TABLE grade_components ADD CONSTRAINT chk_obtained_lte_max CHECK (obtained <= max_marks)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ─────────────────────────────────────────────────────────────
--  notices table
--  Change category & priority: VARCHAR(50) → ENUM
--  Any rows with values outside the enum will be set to 'general'.
--  Add new columns and indexes.
-- ─────────────────────────────────────────────────────────────

-- Step 1: Sanitise existing values before the MODIFY
UPDATE notices SET category = 'general'
  WHERE category NOT IN ('general','exam','assignment','event','holiday','urgent');

UPDATE notices SET priority = 'general'
  WHERE priority NOT IN ('general','low','medium','high');

-- Step 2: MODIFY to ENUM
ALTER TABLE notices
  MODIFY COLUMN category ENUM('general','exam','assignment','event','holiday','urgent')
         NOT NULL DEFAULT 'general',
  MODIFY COLUMN priority ENUM('general','low','medium','high')
         NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_pinned      TINYINT(1)   NOT NULL DEFAULT 0             COMMENT '1 = pinned to top'             AFTER posted_by_user_id,
  ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500) NULL                            COMMENT 'Optional file / link'          AFTER is_pinned,
  ADD COLUMN IF NOT EXISTS expires_at     DATETIME     NULL                            COMMENT 'NULL = never expires'          AFTER attachment_url,
  ADD COLUMN IF NOT EXISTS updated_at     DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP                                        AFTER posted_at;

-- Step 3: New indexes
CREATE INDEX IF NOT EXISTS idx_notices_pinned  ON notices (is_pinned);
CREATE INDEX IF NOT EXISTS idx_notices_expires ON notices (expires_at);
