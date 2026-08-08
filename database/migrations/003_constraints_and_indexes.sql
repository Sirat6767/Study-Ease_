-- Migration 003: Apply strict foreign keys, indexes, triggers, and constraints

-- Ensure legacy dept_id is renamed to department_id if still present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='dept_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='department_id') THEN
    ALTER TABLE batches RENAME COLUMN dept_id TO department_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='batch_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='id') THEN
    ALTER TABLE batches RENAME COLUMN batch_id TO id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_info' AND column_name='dept_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_info' AND column_name='department_id') THEN
    ALTER TABLE academic_info RENAME COLUMN dept_id TO department_id;
  END IF;
END $$;

-- Indexes for hierarchy query optimization
CREATE INDEX IF NOT EXISTS idx_faculties_university_id ON faculties(university_id);
CREATE INDEX IF NOT EXISTS idx_departments_faculty_id  ON departments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_batches_department_id   ON batches(department_id);

-- Create hierarchy integrity trigger function
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

DROP TRIGGER IF EXISTS check_academic_info_hierarchy ON academic_info;
CREATE TRIGGER check_academic_info_hierarchy
  BEFORE INSERT OR UPDATE ON academic_info
  FOR EACH ROW EXECUTE PROCEDURE verify_academic_info_hierarchy();
