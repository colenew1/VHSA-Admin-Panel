-- ==================================================
-- CLEAR ALL STUDENT AND SCREENING DATA
-- KEEP ONLY: Erin Newman (as0019)
-- KEEP: screeners, admins, schools unchanged
-- ==================================================

-- Delete all screening results first (foreign key constraint)
DELETE FROM screening_results;

-- Delete all students EXCEPT as0019
DELETE FROM students WHERE unique_id != 'as0019';

-- Insert/Update the student record to keep
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, teacher, dob, status)
VALUES
  ('as0019', 'Erin', 'Newman', '2nd', 'Female', 'Ascent Academy', 'James', '2015-11-04', 'New')
ON CONFLICT (unique_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  grade = EXCLUDED.grade,
  gender = EXCLUDED.gender,
  school = EXCLUDED.school,
  teacher = EXCLUDED.teacher,
  dob = EXCLUDED.dob,
  status = EXCLUDED.status;

-- Verify
SELECT 
  (SELECT COUNT(*) FROM students) as students_remaining,
  (SELECT COUNT(*) FROM screening_results) as screening_results_remaining,
  (SELECT COUNT(*) FROM admin_users) as admin_users_count,
  (SELECT COUNT(*) FROM schools) as schools_count,
  (SELECT COUNT(*) FROM screeners) as screeners_count;

-- Show the kept student
SELECT * FROM students WHERE unique_id = 'as0019';

