-- Insert 10 students from Ascent Academy with various grades and completion levels
-- Student IDs: as0001 through as0010
-- CORRECTED VERSION with proper column names and no generated columns

-- First, insert the students into the students table
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, dob, status, teacher, created_at, updated_at)
VALUES
  -- Not Started (no screening record yet)
  ('as0001', 'Emma', 'Anderson', 'Kindergarten', 'Female', 'Ascent Academy', '2019-05-15', 'New', 'Ms. Johnson', NOW(), NOW()),
  
  -- Incomplete - Only Vision done
  ('as0002', 'Liam', 'Brown', '1st', 'Male', 'Ascent Academy', '2018-08-22', 'New', 'Ms. Smith', NOW(), NOW()),
  
  -- Completed - All tests passed
  ('as0003', 'Olivia', 'Davis', '2nd', 'Female', 'Ascent Academy', '2017-03-10', 'New', 'Mr. Williams', NOW(), NOW()),
  
  -- Failed - Vision failed, needs rescreen
  ('as0004', 'Noah', 'Garcia', '3rd', 'Male', 'Ascent Academy', '2016-11-05', 'New', 'Ms. Martinez', NOW(), NOW()),
  
  -- Incomplete - Vision and Hearing done, missing Acanthosis and Scoliosis
  ('as0005', 'Sophia', 'Miller', '4th', 'Female', 'Ascent Academy', '2015-09-18', 'New', 'Mr. Jones', NOW(), NOW()),
  
  -- Completed - All tests passed
  ('as0006', 'Mason', 'Wilson', '5th', 'Male', 'Ascent Academy', '2014-07-30', 'New', 'Ms. Taylor', NOW(), NOW()),
  
  -- Absent
  ('as0007', 'Isabella', 'Moore', '6th', 'Female', 'Ascent Academy', '2013-12-14', 'New', 'Mr. Anderson', NOW(), NOW()),
  
  -- Not Started
  ('as0008', 'Ethan', 'Thomas', '7th', 'Male', 'Ascent Academy', '2012-04-25', 'New', 'Ms. Jackson', NOW(), NOW()),
  
  -- Incomplete - Only Vision and Acanthosis done
  ('as0009', 'Ava', 'White', '8th', 'Female', 'Ascent Academy', '2011-10-08', 'New', 'Mr. Harris', NOW(), NOW()),
  
  -- Failed - Hearing failed on rescreen
  ('as0010', 'James', 'Martin', '9th', 'Male', 'Ascent Academy', '2010-06-20', 'New', 'Ms. Clark', NOW(), NOW())
ON CONFLICT (unique_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  grade = EXCLUDED.grade,
  gender = EXCLUDED.gender,
  school = EXCLUDED.school,
  dob = EXCLUDED.dob,
  status = EXCLUDED.status,
  teacher = EXCLUDED.teacher,
  updated_at = NOW();

-- Now insert screening results with VARIED completion levels
-- NOTE: Do NOT include *_complete or *_required columns - they are GENERATED
-- The database will automatically calculate them based on the test result fields

-- as0002 - Incomplete: Only Vision done (missing Hearing, Acanthosis, Scoliosis)
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye, 
  vision_initial_left_eye,
  created_at, 
  updated_at
)
VALUES (
  'as0002', 
  (SELECT id FROM students WHERE unique_id = 'as0002' LIMIT 1), 
  'Liam', 
  'Brown', 
  '1st', 
  'Male',
  'Ascent Academy', 
  'Ms. Smith', 
  '2018-08-22', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '2 days', 
  false,
  '20/20', 
  '20/20',
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  updated_at = NOW();

-- as0003 - Completed: All tests passed
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye, 
  vision_initial_left_eye,
  hearing_initial_right_1000, 
  hearing_initial_right_2000, 
  hearing_initial_right_4000,
  hearing_initial_left_1000, 
  hearing_initial_left_2000, 
  hearing_initial_left_4000,
  acanthosis_initial_result, 
  scoliosis_initial_result,
  created_at, 
  updated_at
)
VALUES (
  'as0003', 
  (SELECT id FROM students WHERE unique_id = 'as0003' LIMIT 1), 
  'Olivia', 
  'Davis', 
  '2nd', 
  'Female',
  'Ascent Academy', 
  'Mr. Williams', 
  '2017-03-10', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '1 day', 
  false,
  '20/20', 
  '20/20',
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 
  'P',
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  hearing_initial_right_1000 = EXCLUDED.hearing_initial_right_1000,
  hearing_initial_right_2000 = EXCLUDED.hearing_initial_right_2000,
  hearing_initial_right_4000 = EXCLUDED.hearing_initial_right_4000,
  hearing_initial_left_1000 = EXCLUDED.hearing_initial_left_1000,
  hearing_initial_left_2000 = EXCLUDED.hearing_initial_left_2000,
  hearing_initial_left_4000 = EXCLUDED.hearing_initial_left_4000,
  acanthosis_initial_result = EXCLUDED.acanthosis_initial_result,
  scoliosis_initial_result = EXCLUDED.scoliosis_initial_result,
  updated_at = NOW();

-- as0004 - Failed: Vision failed on initial and rescreen
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye, 
  vision_initial_left_eye,
  hearing_initial_right_1000, 
  hearing_initial_right_2000, 
  hearing_initial_right_4000,
  hearing_initial_left_1000, 
  hearing_initial_left_2000, 
  hearing_initial_left_4000,
  acanthosis_initial_result, 
  scoliosis_initial_result,
  vision_rescreen_right_eye, 
  vision_rescreen_left_eye,
  created_at, 
  updated_at
)
VALUES (
  'as0004', 
  (SELECT id FROM students WHERE unique_id = 'as0004' LIMIT 1), 
  'Noah', 
  'Garcia', 
  '3rd', 
  'Male',
  'Ascent Academy', 
  'Ms. Martinez', 
  '2016-11-05', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '3 days', 
  false,
  '20/40', 
  '20/50',
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 
  'P',
  '20/30', 
  '20/30',
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  vision_rescreen_right_eye = EXCLUDED.vision_rescreen_right_eye,
  vision_rescreen_left_eye = EXCLUDED.vision_rescreen_left_eye,
  updated_at = NOW();

-- as0005 - Incomplete: Vision and Hearing done, missing Acanthosis and Scoliosis
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye, 
  vision_initial_left_eye,
  hearing_initial_right_1000, 
  hearing_initial_right_2000, 
  hearing_initial_right_4000,
  hearing_initial_left_1000, 
  hearing_initial_left_2000, 
  hearing_initial_left_4000,
  created_at, 
  updated_at
)
VALUES (
  'as0005', 
  (SELECT id FROM students WHERE unique_id = 'as0005' LIMIT 1), 
  'Sophia', 
  'Miller', 
  '4th', 
  'Female',
  'Ascent Academy', 
  'Mr. Jones', 
  '2015-09-18', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '1 day', 
  false,
  '20/20', 
  '20/20',
  'P', 'P', 'P', 'P', 'P', 'P',
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  hearing_initial_right_1000 = EXCLUDED.hearing_initial_right_1000,
  hearing_initial_right_2000 = EXCLUDED.hearing_initial_right_2000,
  hearing_initial_right_4000 = EXCLUDED.hearing_initial_right_4000,
  hearing_initial_left_1000 = EXCLUDED.hearing_initial_left_1000,
  hearing_initial_left_2000 = EXCLUDED.hearing_initial_left_2000,
  hearing_initial_left_4000 = EXCLUDED.hearing_initial_left_4000,
  updated_at = NOW();

-- as0006 - Completed: All tests passed
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye, 
  vision_initial_left_eye,
  hearing_initial_right_1000, 
  hearing_initial_right_2000, 
  hearing_initial_right_4000,
  hearing_initial_left_1000, 
  hearing_initial_left_2000, 
  hearing_initial_left_4000,
  acanthosis_initial_result, 
  scoliosis_initial_result,
  created_at, 
  updated_at
)
VALUES (
  'as0006', 
  (SELECT id FROM students WHERE unique_id = 'as0006' LIMIT 1), 
  'Mason', 
  'Wilson', 
  '5th', 
  'Male',
  'Ascent Academy', 
  'Ms. Taylor', 
  '2014-07-30', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '2 days', 
  false,
  '20/20', 
  '20/20',
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 
  'P',
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  hearing_initial_right_1000 = EXCLUDED.hearing_initial_right_1000,
  hearing_initial_right_2000 = EXCLUDED.hearing_initial_right_2000,
  hearing_initial_right_4000 = EXCLUDED.hearing_initial_right_4000,
  hearing_initial_left_1000 = EXCLUDED.hearing_initial_left_1000,
  hearing_initial_left_2000 = EXCLUDED.hearing_initial_left_2000,
  hearing_initial_left_4000 = EXCLUDED.hearing_initial_left_4000,
  acanthosis_initial_result = EXCLUDED.acanthosis_initial_result,
  scoliosis_initial_result = EXCLUDED.scoliosis_initial_result,
  updated_at = NOW();

-- as0007 - Absent: Marked as absent
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  created_at, 
  updated_at
)
VALUES (
  'as0007', 
  (SELECT id FROM students WHERE unique_id = 'as0007' LIMIT 1), 
  'Isabella', 
  'Moore', 
  '6th', 
  'Female',
  'Ascent Academy', 
  'Mr. Anderson', 
  '2013-12-14', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '1 day', 
  true,
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  was_absent = EXCLUDED.was_absent,
  updated_at = NOW();

-- as0009 - Incomplete: Vision and Acanthosis done, missing Hearing and Scoliosis
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye, 
  vision_initial_left_eye,
  acanthosis_initial_result,
  created_at, 
  updated_at
)
VALUES (
  'as0009', 
  (SELECT id FROM students WHERE unique_id = 'as0009' LIMIT 1), 
  'Ava', 
  'White', 
  '8th', 
  'Female',
  'Ascent Academy', 
  'Mr. Harris', 
  '2011-10-08', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '1 day', 
  false,
  '20/20', 
  '20/20',
  'P',
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  acanthosis_initial_result = EXCLUDED.acanthosis_initial_result,
  updated_at = NOW();

-- as0010 - Failed: Hearing failed on initial, passed on rescreen
INSERT INTO screening_results (
  unique_id, 
  student_id, 
  student_first_name, 
  student_last_name, 
  student_grade, 
  student_gender,
  student_school, 
  student_teacher, 
  student_dob, 
  student_status,
  screening_year, 
  initial_screening_date, 
  was_absent,
  vision_initial_right_eye, 
  vision_initial_left_eye,
  hearing_initial_right_1000, 
  hearing_initial_right_2000, 
  hearing_initial_right_4000,
  hearing_initial_left_1000, 
  hearing_initial_left_2000, 
  hearing_initial_left_4000,
  hearing_rescreen_right_1000, 
  hearing_rescreen_right_2000, 
  hearing_rescreen_right_4000,
  hearing_rescreen_left_1000, 
  hearing_rescreen_left_2000, 
  hearing_rescreen_left_4000,
  acanthosis_initial_result, 
  scoliosis_initial_result,
  created_at, 
  updated_at
)
VALUES (
  'as0010', 
  (SELECT id FROM students WHERE unique_id = 'as0010' LIMIT 1), 
  'James', 
  'Martin', 
  '9th', 
  'Male',
  'Ascent Academy', 
  'Ms. Clark', 
  '2010-06-20', 
  'New',
  EXTRACT(YEAR FROM NOW())::INTEGER, 
  CURRENT_DATE - INTERVAL '2 days', 
  false,
  '20/20', 
  '20/20',
  'F', 'F', 'P', 'F', 'F', 'P',
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 
  'P',
  NOW(), 
  NOW()
)
ON CONFLICT (unique_id) DO UPDATE SET
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  hearing_initial_right_1000 = EXCLUDED.hearing_initial_right_1000,
  hearing_initial_right_2000 = EXCLUDED.hearing_initial_right_2000,
  hearing_initial_right_4000 = EXCLUDED.hearing_initial_right_4000,
  hearing_initial_left_1000 = EXCLUDED.hearing_initial_left_1000,
  hearing_initial_left_2000 = EXCLUDED.hearing_initial_left_2000,
  hearing_initial_left_4000 = EXCLUDED.hearing_initial_left_4000,
  hearing_rescreen_right_1000 = EXCLUDED.hearing_rescreen_right_1000,
  hearing_rescreen_right_2000 = EXCLUDED.hearing_rescreen_right_2000,
  hearing_rescreen_right_4000 = EXCLUDED.hearing_rescreen_right_4000,
  hearing_rescreen_left_1000 = EXCLUDED.hearing_rescreen_left_1000,
  hearing_rescreen_left_2000 = EXCLUDED.hearing_rescreen_left_2000,
  hearing_rescreen_left_4000 = EXCLUDED.hearing_rescreen_left_4000,
  acanthosis_initial_result = EXCLUDED.acanthosis_initial_result,
  scoliosis_initial_result = EXCLUDED.scoliosis_initial_result,
  updated_at = NOW();

-- Summary of completion levels:
-- as0001: Not Started (no screening record) - vision_complete, hearing_complete, etc. will all be false
-- as0002: Incomplete - Only Vision done (vision_complete=true, others=false)
-- as0003: Completed - All tests passed (all *_complete=true)
-- as0004: Failed - Vision failed (all *_complete=true, but vision failed)
-- as0005: Incomplete - Vision and Hearing done (vision_complete=true, hearing_complete=true, others=false)
-- as0006: Completed - All tests passed (all *_complete=true)
-- as0007: Absent (all *_complete=false)
-- as0008: Not Started (no screening record)
-- as0009: Incomplete - Vision and Acanthosis done (vision_complete=true, acanthosis_complete=true, others=false)
-- as0010: Failed - Hearing failed initially, passed on rescreen (all *_complete=true)

