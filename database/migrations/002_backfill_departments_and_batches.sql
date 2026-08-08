-- Migration 002: Backfill Faculties and re-link Departments and Batches

-- 1. Ensure faculty_id column exists on departments FIRST
ALTER TABLE departments ADD COLUMN IF NOT EXISTS faculty_id INTEGER NULL;

-- 2. Create a Default Faculty for existing universities if none exists
INSERT INTO faculties (university_id, faculty_name, faculty_code)
SELECT u.id, 'Faculty of General Studies', 'GEN'
FROM universities u
WHERE NOT EXISTS (
  SELECT 1 FROM faculties f WHERE f.university_id = u.id
);

-- 3. Link Departments to their University's Default Faculty using dynamic SQL execution
DO $$
BEGIN
  -- If departments has uni_code column, link via uni_code = university_code
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='uni_code') THEN
    EXECUTE '
      UPDATE departments d
      SET faculty_id = (
        SELECT f.id FROM faculties f 
        JOIN universities u ON u.id = f.university_id 
        WHERE u.university_code = d.uni_code LIMIT 1
      )
      WHERE d.faculty_id IS NULL;
    ';
  END IF;

  -- Fallback: Assign any remaining unlinked departments to the first available faculty
  UPDATE departments
  SET faculty_id = (SELECT id FROM faculties LIMIT 1)
  WHERE faculty_id IS NULL;
END $$;
