-- Test query to check if screening_results can be inserted
-- This will help identify which fields are generated vs required

-- First, check what columns are generated
SELECT 
    column_name,
    is_generated,
    generation_expression,
    column_default
FROM information_schema.columns
WHERE table_name = 'screening_results'
AND (column_name LIKE '%_complete' OR column_name LIKE '%_required')
ORDER BY column_name;

-- Test insert with minimal required fields
-- This will fail if we're missing required fields or trying to set generated fields
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye,
  vision_initial_left_eye
)
VALUES (
  'TEST001',
  (SELECT id FROM students WHERE unique_id = 'as0001' LIMIT 1),
  'Test',
  'Student',
  'Kindergarten',
  'Female',
  'Ascent Academy',
  '2019-01-01',
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER,
  CURRENT_DATE,
  false,
  '20/20',
  '20/20'
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye;

-- Check if it worked
SELECT 
  unique_id,
  student_first_name,
  student_last_name,
  vision_required,
  vision_complete,
  vision_initial_right_eye,
  vision_initial_left_eye
FROM screening_results
WHERE unique_id = 'TEST001';

-- Clean up test
DELETE FROM screening_results WHERE unique_id = 'TEST001';

