-- Migration 001: Add Faculties table and update Primary/Foreign key definitions
-- Safe and idempotent for upgrading existing StudyEase databases

-- 1. Create Faculties Table
CREATE TABLE IF NOT EXISTS faculties (
  id            SERIAL PRIMARY KEY,
  university_id INTEGER NULL,
  faculty_code  VARCHAR(50) NULL,
  faculty_name  VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMP WITH TIME ZONE NULL
);

-- 2. Rename legacy columns in universities, departments, and batches if present
DO $$
BEGIN
  -- Universities renames
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='uni_code')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='university_code') THEN
    ALTER TABLE universities RENAME COLUMN uni_code TO university_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='uni_name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='university_name') THEN
    ALTER TABLE universities RENAME COLUMN uni_name TO university_name;
  END IF;

  -- Departments renames
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='dept_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='id') THEN
    ALTER TABLE departments RENAME COLUMN dept_id TO id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='dept_code')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='department_code') THEN
    ALTER TABLE departments RENAME COLUMN dept_code TO department_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='dept_name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='department_name') THEN
    ALTER TABLE departments RENAME COLUMN dept_name TO department_name;
  END IF;

  -- Batches renames
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='batch_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='id') THEN
    ALTER TABLE batches RENAME COLUMN batch_id TO id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='dept_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='department_id') THEN
    ALTER TABLE batches RENAME COLUMN dept_id TO department_id;
  END IF;

  -- Academic Info renames
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_info' AND column_name='dept_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_info' AND column_name='department_id') THEN
    ALTER TABLE academic_info RENAME COLUMN dept_id TO department_id;
  END IF;
END $$;

-- 3. Ensure standard columns exist across all tables
ALTER TABLE universities ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS university_code VARCHAR(50);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS university_name VARCHAR(255);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE universities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE universities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE departments ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS faculty_id INTEGER NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS department_code VARCHAR(20);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE batches ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE batches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
