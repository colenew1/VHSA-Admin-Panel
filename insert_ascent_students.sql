-- Insert 10 students from Ascent Academy with various grades and completion levels
-- Student IDs: as0001 through as0010

-- First, insert the students into the students table
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, dob, status, teacher, created_at, updated_at)
VALUES
  -- Not Started (no screening record yet)
  ('as0001', 'Emma', 'Anderson', 'Kindergarten', 'Female', 'Ascent Academy', '2019-05-15', 'new', 'Ms. Johnson', NOW(), NOW()),
  
  -- Incomplete (started but missing tests)
  ('as0002', 'Liam', 'Brown', '1st', 'Male', 'Ascent Academy', '2018-08-22', 'new', 'Ms. Smith', NOW(), NOW()),
  
  -- Completed (all tests done)
  ('as0003', 'Olivia', 'Davis', '2nd', 'Female', 'Ascent Academy', '2017-03-10', 'new', 'Mr. Williams', NOW(), NOW()),
  
  -- Failed (has failed tests)
  ('as0004', 'Noah', 'Garcia', '3rd', 'Male', 'Ascent Academy', '2016-11-05', 'new', 'Ms. Martinez', NOW(), NOW()),
  
  -- Incomplete (missing some tests)
  ('as0005', 'Sophia', 'Miller', '4th', 'Female', 'Ascent Academy', '2015-09-18', 'new', 'Mr. Jones', NOW(), NOW()),
  
  -- Completed
  ('as0006', 'Mason', 'Wilson', '5th', 'Male', 'Ascent Academy', '2014-07-30', 'new', 'Ms. Taylor', NOW(), NOW()),
  
  -- Absent
  ('as0007', 'Isabella', 'Moore', '6th', 'Female', 'Ascent Academy', '2013-12-14', 'new', 'Mr. Anderson', NOW(), NOW()),
  
  -- Not Started
  ('as0008', 'Ethan', 'Thomas', '7th', 'Male', 'Ascent Academy', '2012-04-25', 'new', 'Ms. Jackson', NOW(), NOW()),
  
  -- Incomplete
  ('as0009', 'Ava', 'White', '8th', 'Female', 'Ascent Academy', '2011-10-08', 'new', 'Mr. Harris', NOW(), NOW()),
  
  -- Completed
  ('as0010', 'James', 'Martin', '9th', 'Male', 'Ascent Academy', '2010-06-20', 'new', 'Ms. Clark', NOW(), NOW())
ON CONFLICT (unique_id) DO NOTHING;

-- Now insert screening results to show various completion levels
-- Note: Adjust dates and test results based on your needs

-- as0002 - Incomplete (missing hearing and scoliosis)
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  vision_initial_right, vision_initial_left,
  acanthosis_initial,
  created_at, updated_at
)
VALUES (
  'as0002', 'as0002', 'Liam', 'Brown', '1st', 'Male',
  'Ascent Academy', 'Ms. Smith', '2018-08-22', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '2 days', false,
  true, true, true, true,
  true, false, true, false,  -- Vision and Acanthosis complete, Hearing and Scoliosis incomplete
  '20/20', '20/20',
  'P',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- as0003 - Completed (all tests passed)
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  vision_initial_right, vision_initial_left,
  hearing_initial_right_1000, hearing_initial_right_2000, hearing_initial_right_4000,
  hearing_initial_left_1000, hearing_initial_left_2000, hearing_initial_left_4000,
  acanthosis_initial, scoliosis_initial,
  created_at, updated_at
)
VALUES (
  'as0003', 'as0003', 'Olivia', 'Davis', '2nd', 'Female',
  'Ascent Academy', 'Mr. Williams', '2017-03-10', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '1 day', false,
  true, true, true, true,
  true, true, true, true,  -- All complete
  '20/20', '20/20',
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 'P',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- as0004 - Failed (vision failed, needs rescreen)
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  vision_initial_right, vision_initial_left,
  hearing_initial_right_1000, hearing_initial_right_2000, hearing_initial_right_4000,
  hearing_initial_left_1000, hearing_initial_left_2000, hearing_initial_left_4000,
  acanthosis_initial, scoliosis_initial,
  vision_rescreen_right, vision_rescreen_left,  -- Rescreen results
  created_at, updated_at
)
VALUES (
  'as0004', 'as0004', 'Noah', 'Garcia', '3rd', 'Male',
  'Ascent Academy', 'Ms. Martinez', '2016-11-05', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '3 days', false,
  true, true, true, true,
  true, true, true, true,  -- All complete but vision failed
  '20/40', '20/50',  -- Failed initial vision
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 'P',
  '20/30', '20/30',  -- Still failed on rescreen
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- as0005 - Incomplete (missing acanthosis and scoliosis)
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  vision_initial_right, vision_initial_left,
  hearing_initial_right_1000, hearing_initial_right_2000, hearing_initial_right_4000,
  hearing_initial_left_1000, hearing_initial_left_2000, hearing_initial_left_4000,
  created_at, updated_at
)
VALUES (
  'as0005', 'as0005', 'Sophia', 'Miller', '4th', 'Female',
  'Ascent Academy', 'Mr. Jones', '2015-09-18', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '1 day', false,
  true, true, true, true,
  true, true, false, false,  -- Vision and Hearing complete, Acanthosis and Scoliosis incomplete
  '20/20', '20/20',
  'P', 'P', 'P', 'P', 'P', 'P',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- as0006 - Completed (all tests passed)
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  vision_initial_right, vision_initial_left,
  hearing_initial_right_1000, hearing_initial_right_2000, hearing_initial_right_4000,
  hearing_initial_left_1000, hearing_initial_left_2000, hearing_initial_left_4000,
  acanthosis_initial, scoliosis_initial,
  created_at, updated_at
)
VALUES (
  'as0006', 'as0006', 'Mason', 'Wilson', '5th', 'Male',
  'Ascent Academy', 'Ms. Taylor', '2014-07-30', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '2 days', false,
  true, true, true, true,
  true, true, true, true,  -- All complete
  '20/20', '20/20',
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 'P',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- as0007 - Absent
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  created_at, updated_at
)
VALUES (
  'as0007', 'as0007', 'Isabella', 'Moore', '6th', 'Female',
  'Ascent Academy', 'Mr. Anderson', '2013-12-14', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '1 day', true,  -- was_absent = true
  true, true, true, true,
  false, false, false, false,  -- None complete because absent
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- as0009 - Incomplete (only vision done)
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  vision_initial_right, vision_initial_left,
  created_at, updated_at
)
VALUES (
  'as0009', 'as0009', 'Ava', 'White', '8th', 'Female',
  'Ascent Academy', 'Mr. Harris', '2011-10-08', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '1 day', false,
  true, true, true, true,
  true, false, false, false,  -- Only vision complete
  '20/20', '20/20',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- as0010 - Completed (all tests passed)
INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_required, hearing_required, acanthosis_required, scoliosis_required,
  vision_complete, hearing_complete, acanthosis_complete, scoliosis_complete,
  vision_initial_right, vision_initial_left,
  hearing_initial_right_1000, hearing_initial_right_2000, hearing_initial_right_4000,
  hearing_initial_left_1000, hearing_initial_left_2000, hearing_initial_left_4000,
  acanthosis_initial, scoliosis_initial,
  created_at, updated_at
)
VALUES (
  'as0010', 'as0010', 'James', 'Martin', '9th', 'Male',
  'Ascent Academy', 'Ms. Clark', '2010-06-20', 'new',
  EXTRACT(YEAR FROM NOW())::INTEGER, CURRENT_DATE - INTERVAL '2 days', false,
  true, true, true, true,
  true, true, true, true,  -- All complete
  '20/20', '20/20',
  'P', 'P', 'P', 'P', 'P', 'P',
  'P', 'P',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- Summary:
-- as0001: Not Started (no screening record)
-- as0002: Incomplete (missing hearing and scoliosis)
-- as0003: Completed (all tests passed)
-- as0004: Failed (vision failed on initial and rescreen)
-- as0005: Incomplete (missing acanthosis and scoliosis)
-- as0006: Completed (all tests passed)
-- as0007: Absent
-- as0008: Not Started (no screening record)
-- as0009: Incomplete (only vision done)
-- as0010: Completed (all tests passed)

