-- ==================================================
-- INSERT TEST DATA WITH VARIED STATUSES
-- ==================================================
-- 18 Ascent Academy students: 
-- 3 complete (pass), 3 complete with failures, 6 incomplete, 3 absent, 3 not started

-- Insert Students
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, teacher, dob, status)
VALUES
  -- Complete (pass) - 3
  ('as0001', 'Emma', 'Anderson', 'Kindergarten', 'Female', 'Ascent Academy', 'Smith', '2018-05-15', 'New'),
  ('as0002', 'Liam', 'Brown', '1st', 'Male', 'Ascent Academy', 'Johnson', '2017-08-20', 'New'),
  ('as0003', 'Olivia', 'Davis', '3rd', 'Female', 'Ascent Academy', 'Williams', '2016-03-10', 'New'),
  
  -- Complete with failures - 3
  ('as0004', 'Noah', 'Garcia', 'Kindergarten', 'Male', 'Ascent Academy', 'Smith', '2018-11-05', 'New'),
  ('as0005', 'Sophia', 'Miller', '1st', 'Female', 'Ascent Academy', 'Johnson', '2017-02-14', 'New'),
  ('as0006', 'Mason', 'Wilson', '5th', 'Male', 'Ascent Academy', 'Brown', '2015-09-30', 'New'),
  
  -- Incomplete - 6 (missing required tests)
  ('as0007', 'Isabella', 'Moore', 'Kindergarten', 'Female', 'Ascent Academy', 'Smith', '2018-04-22', 'New'),
  ('as0008', 'Ethan', 'Taylor', '1st', 'Male', 'Ascent Academy', 'Johnson', '2017-07-18', 'New'),
  ('as0009', 'Ava', 'White', '3rd', 'Female', 'Ascent Academy', 'Williams', '2016-12-08', 'New'),
  ('as0010', 'James', 'Martin', '5th', 'Male', 'Ascent Academy', 'Brown', '2015-10-25', 'New'),
  ('as0011', 'Charlotte', 'Thompson', '7th', 'Female', 'Ascent Academy', 'Davis', '2014-06-12', 'New'),
  ('as0012', 'Benjamin', 'Harris', '2nd', 'Male', 'Ascent Academy', 'Williams', '2017-08-30', 'New'),
  
  -- Absent - 3
  ('as0013', 'Amelia', 'Clark', '4th', 'Female', 'Ascent Academy', 'Brown', '2016-03-20', 'New'),
  ('as0014', 'Lucas', 'Lewis', '6th', 'Male', 'Ascent Academy', 'Davis', '2015-11-15', 'New'),
  ('as0015', 'Harper', 'Walker', '8th', 'Female', 'Ascent Academy', 'Davis', '2014-09-05', 'New'),
  
  -- Not started - 3
  ('as0016', 'Henry', 'Hall', '2nd', 'Male', 'Ascent Academy', 'Williams', '2017-01-25', 'New'),
  ('as0017', 'Mia', 'Allen', '4th', 'Female', 'Ascent Academy', 'Brown', '2016-05-10', 'New'),
  ('as0018', 'Alexander', 'Young', '6th', 'Male', 'Ascent Academy', 'Davis', '2015-07-22', 'New')
ON CONFLICT (unique_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  grade = EXCLUDED.grade,
  gender = EXCLUDED.gender,
  school = EXCLUDED.school,
  teacher = EXCLUDED.teacher,
  dob = EXCLUDED.dob,
  status = EXCLUDED.status;

-- Delete existing screening results for these students first
DELETE FROM screening_results 
WHERE unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0007', 'as0008', 'as0009', 'as0010', 'as0011', 'as0012', 'as0013', 'as0014', 'as0015');

-- Insert Screening Results
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
    WHEN s.unique_id IN ('as0013', 'as0014', 'as0015') THEN DATE '2025-01-15'
    ELSE DATE '2025-01-10'
  END,
  CASE WHEN s.unique_id IN ('as0013', 'as0014', 'as0015') THEN true ELSE false END,
  -- Vision: All screened students have vision data
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0007', 'as0008', 'as0009', 'as0010', 'as0011', 'as0012', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0004', 'as0005') THEN '20/50' ELSE '20/20' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0007', 'as0008', 'as0009', 'as0010', 'as0011', 'as0012', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0004', 'as0005') THEN '20/50' ELSE '20/20' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0007', 'as0008', 'as0009', 'as0010', 'as0011', 'as0012', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0004', 'as0005') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  -- Hearing: Complete for as0001-as0006, as0011; Missing for incomplete students
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0008', 'as0010', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0006') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0008', 'as0010', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0006') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0008', 'as0010', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0006') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0008', 'as0010', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0006') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0008', 'as0010', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0006') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0008', 'as0010', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0006') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0008', 'as0010', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0006') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  -- Acanthosis: Complete for as0001-as0006, as0009, as0011; Missing for incomplete
  CASE WHEN s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0009', 'as0011', 'as0013', 'as0014', 'as0015') THEN 
    CASE WHEN s.unique_id IN ('as0005') THEN 'F' ELSE 'P' END
    ELSE NULL 
  END,
  -- Scoliosis: Only for as0011 (7th grade female)
  CASE WHEN s.unique_id = 'as0011' THEN 'P' ELSE NULL END
FROM students s
WHERE s.unique_id IN ('as0001', 'as0002', 'as0003', 'as0004', 'as0005', 'as0006', 'as0007', 'as0008', 'as0009', 'as0010', 'as0011', 'as0012', 'as0013', 'as0014', 'as0015');

