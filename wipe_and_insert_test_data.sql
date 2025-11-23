-- ==================================================
-- INSERT TEST DATA WITH GUARANTEED INCOMPLETE STATUS
-- ==================================================
-- 10 Ascent Academy students with various completion statuses
-- Distribution: 2 complete, 4 incomplete (guaranteed), 2 not started, 2 absent
--
-- Grade Requirements:
-- Kindergarten: Vision + Hearing (both required)
-- 1st: Vision + Hearing + Acanthosis (all required)
-- 2nd: Vision + Hearing + Acanthosis (new students only)
-- 3rd: Vision + Hearing + Acanthosis (all required)
-- 4th: Vision + Hearing + Acanthosis (new students only)
-- 5th: Vision + Hearing + Acanthosis + Scoliosis (if Female)
-- 6th: Vision + Hearing + Acanthosis (new students only)
-- 7th: Vision + Hearing + Acanthosis + Scoliosis (if Female)

-- Insert Students
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, teacher, dob, status)
VALUES
  -- Complete students (2)
  ('as0001', 'Emma', 'Anderson', 'Kindergarten', 'Female', 'Ascent Academy', 'Smith', '2018-05-15', 'New'),
  ('as0002', 'Liam', 'Brown', '1st', 'Male', 'Ascent Academy', 'Johnson', '2017-08-20', 'New'),
  
  -- INCOMPLETE students (4) - Missing required tests
  ('as0003', 'Olivia', 'Davis', 'Kindergarten', 'Female', 'Ascent Academy', 'Smith', '2018-03-10', 'New'), -- Missing hearing (needs V+H)
  ('as0004', 'Noah', 'Garcia', '1st', 'Male', 'Ascent Academy', 'Johnson', '2017-11-05', 'New'), -- Missing acanthosis (needs V+H+A)
  ('as0005', 'Sophia', 'Miller', '3rd', 'Female', 'Ascent Academy', 'Williams', '2016-02-14', 'New'), -- Missing hearing (needs V+H+A)
  ('as0006', 'Mason', 'Wilson', '5th', 'Male', 'Ascent Academy', 'Brown', '2015-09-30', 'New'), -- Missing acanthosis (needs V+H+A)
  
  -- Not started (2) - No screening record
  ('as0007', 'Isabella', 'Moore', '2nd', 'Female', 'Ascent Academy', 'Williams', '2017-04-22', 'New'),
  ('as0008', 'Ethan', 'Taylor', '4th', 'Male', 'Ascent Academy', 'Brown', '2016-07-18', 'New'),
  
  -- Absent (2)
  ('as0009', 'Ava', 'White', '6th', 'Female', 'Ascent Academy', 'Davis', '2015-12-08', 'New'),
  ('as0010', 'James', 'Martin', '7th', 'Male', 'Ascent Academy', 'Davis', '2014-10-25', 'New')
ON CONFLICT (unique_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  grade = EXCLUDED.grade,
  gender = EXCLUDED.gender,
  school = EXCLUDED.school,
  teacher = EXCLUDED.teacher,
  dob = EXCLUDED.dob,
  status = EXCLUDED.status;

-- Insert Screening Results
-- Only insert for students who have been screened (not as0007, as0008)
INSERT INTO screening_results (
  student_id,
  unique_id,
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
  vision_initial_result,
  hearing_initial_right_1000,
  hearing_initial_right_2000,
  hearing_initial_right_4000,
  hearing_initial_left_1000,
  hearing_initial_left_2000,
  hearing_initial_left_4000,
  hearing_initial_result,
  acanthosis_initial_result,
  scoliosis_initial_result
)
SELECT 
  s.id,
  s.unique_id,
  s.first_name,
  s.last_name,
  s.grade,
  s.gender,
  s.school,
  s.teacher,
  s.dob,
  s.status,
  2025,
  CASE 
    WHEN s.unique_id IN ('as0009', 'as0010') THEN '2025-01-15'::DATE
    ELSE '2025-01-10'::DATE
  END,
  CASE WHEN s.unique_id IN ('as0009', 'as0010') THEN true ELSE false END,
  -- Vision: Complete for all screened students (as0001-as0006, as0009-as0010)
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0009', 'as0010') THEN '20/20' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0009', 'as0010') THEN '20/20' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  -- Hearing: Complete for as0001, as0002; Missing for as0003, as0005 (incomplete)
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0004', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0004', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0004', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0004', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0004', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0004', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0004', 'as0006', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  -- Acanthosis: Complete for as0001, as0002; Missing for as0004, as0006 (incomplete)
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0005', 'as0009', 'as0010') THEN 'P' ELSE NULL END,
  -- Scoliosis: Not required for these grades/genders
  NULL
FROM students s
WHERE s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0009', 'as0010')
ON CONFLICT (unique_id) DO UPDATE SET
  student_first_name = EXCLUDED.student_first_name,
  student_last_name = EXCLUDED.student_last_name,
  student_grade = EXCLUDED.student_grade,
  student_gender = EXCLUDED.student_gender,
  student_school = EXCLUDED.student_school,
  student_teacher = EXCLUDED.student_teacher,
  student_dob = EXCLUDED.student_dob,
  student_status = EXCLUDED.student_status,
  screening_year = EXCLUDED.screening_year,
  initial_screening_date = EXCLUDED.initial_screening_date,
  was_absent = EXCLUDED.was_absent,
  vision_initial_right_eye = EXCLUDED.vision_initial_right_eye,
  vision_initial_left_eye = EXCLUDED.vision_initial_left_eye,
  vision_initial_result = EXCLUDED.vision_initial_result,
  hearing_initial_right_1000 = EXCLUDED.hearing_initial_right_1000,
  hearing_initial_right_2000 = EXCLUDED.hearing_initial_right_2000,
  hearing_initial_right_4000 = EXCLUDED.hearing_initial_right_4000,
  hearing_initial_left_1000 = EXCLUDED.hearing_initial_left_1000,
  hearing_initial_left_2000 = EXCLUDED.hearing_initial_left_2000,
  hearing_initial_left_4000 = EXCLUDED.hearing_initial_left_4000,
  hearing_initial_result = EXCLUDED.hearing_initial_result,
  acanthosis_initial_result = EXCLUDED.acanthosis_initial_result,
  scoliosis_initial_result = EXCLUDED.scoliosis_initial_result;

-- Verification Query
-- Check the status of each student
SELECT 
  s.unique_id,
  s.first_name || ' ' || s.last_name as name,
  s.grade,
  s.gender,
  sr.initial_screening_date,
  sr.was_absent,
  sr.vision_required,
  sr.vision_complete,
  sr.hearing_required,
  sr.hearing_complete,
  sr.acanthosis_required,
  sr.acanthosis_complete,
  sr.scoliosis_required,
  sr.scoliosis_complete,
  CASE 
    WHEN sr.initial_screening_date IS NULL THEN 'Not Started'
    WHEN sr.was_absent THEN 'Absent'
    WHEN (sr.vision_required = false OR sr.vision_complete = true) 
         AND (sr.hearing_required = false OR sr.hearing_complete = true)
         AND (sr.acanthosis_required = false OR sr.acanthosis_complete = true)
         AND (sr.scoliosis_required = false OR sr.scoliosis_complete = true)
    THEN 'Complete'
    ELSE 'Incomplete'
  END as calculated_status
FROM students s
LEFT JOIN screening_results sr ON s.unique_id = sr.unique_id
WHERE s.school = 'Ascent Academy'
ORDER BY s.unique_id;

