-- ==================================================
-- WIPE DATABASE
-- ==================================================
-- Deletes all screening results and students
-- WARNING: This will delete ALL data!

DELETE FROM screening_results;
DELETE FROM students;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM students) as students_remaining,
  (SELECT COUNT(*) FROM screening_results) as screening_results_remaining;

