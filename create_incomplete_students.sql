-- ==================================================
-- CREATE 3 GUARANTEED INCOMPLETE STUDENTS FOR ASCENT ACADEMY
-- ==================================================
-- These students will be INCOMPLETE because they're missing required tests

-- Student 1: Kindergarten - Missing Hearing (requires Vision + Hearing)
-- Has Vision, but missing Hearing → INCOMPLETE
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, dob, status, teacher, created_at, updated_at)
VALUES ('as0011', 'Alex', 'Johnson', 'Kindergarten', 'Male', 'Ascent Academy', '2019-08-10', 'New', 'Smith', NOW(), NOW())
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

INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_initial_right_eye, vision_initial_left_eye,
  -- Hearing missing (required for Kindergarten)
  created_at, updated_at
)
VALUES (
  'as0011',
  (SELECT id FROM students WHERE unique_id = 'as0011' LIMIT 1),
  'Alex', 'Johnson', 'Kindergarten', 'Male',
  'Ascent Academy', 'Smith', '2019-08-10', 'New',
  EXTRACT(YEAR FROM NOW())::INTEGER,
  CURRENT_DATE - INTERVAL '2 days',
  false,
  '20/20', '20/20',  -- Vision: COMPLETE
  -- Hearing: MISSING (required) → INCOMPLETE
  NOW(), NOW()
);

-- Student 2: 1st Grade - Missing Acanthosis (requires Vision + Hearing + Acanthosis)
-- Has Vision and Hearing, but missing Acanthosis → INCOMPLETE
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, dob, status, teacher, created_at, updated_at)
VALUES ('as0012', 'Bella', 'Martinez', '1st', 'Female', 'Ascent Academy', '2018-05-15', 'New', 'Williams', NOW(), NOW())
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

INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  vision_initial_right_eye, vision_initial_left_eye,
  hearing_initial_right_1000, hearing_initial_right_2000, hearing_initial_right_4000,
  hearing_initial_left_1000, hearing_initial_left_2000, hearing_initial_left_4000,
  -- Acanthosis missing (required for 1st grade)
  created_at, updated_at
)
VALUES (
  'as0012',
  (SELECT id FROM students WHERE unique_id = 'as0012' LIMIT 1),
  'Bella', 'Martinez', '1st', 'Female',
  'Ascent Academy', 'Williams', '2018-05-15', 'New',
  EXTRACT(YEAR FROM NOW())::INTEGER,
  CURRENT_DATE - INTERVAL '1 day',
  false,
  '20/20', '20/20',  -- Vision: COMPLETE
  'P', 'P', 'P', 'P', 'P', 'P',  -- Hearing: COMPLETE
  -- Acanthosis: MISSING (required) → INCOMPLETE
  NOW(), NOW()
);

-- Student 3: 2nd Grade (New) - Missing Vision (requires Vision + Hearing + Acanthosis for New students)
-- Has Hearing and Acanthosis, but missing Vision → INCOMPLETE
INSERT INTO students (unique_id, first_name, last_name, grade, gender, school, dob, status, teacher, created_at, updated_at)
VALUES ('as0013', 'Charlie', 'Brown', '2nd', 'Male', 'Ascent Academy', '2017-09-20', 'New', 'Davis', NOW(), NOW())
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

INSERT INTO screening_results (
  unique_id, student_id, student_first_name, student_last_name, student_grade, student_gender,
  student_school, student_teacher, student_dob, student_status,
  screening_year, initial_screening_date, was_absent,
  -- Vision missing (required for 2nd grade New students)
  hearing_initial_right_1000, hearing_initial_right_2000, hearing_initial_right_4000,
  hearing_initial_left_1000, hearing_initial_left_2000, hearing_initial_left_4000,
  acanthosis_initial_result,
  created_at, updated_at
)
VALUES (
  'as0013',
  (SELECT id FROM students WHERE unique_id = 'as0013' LIMIT 1),
  'Charlie', 'Brown', '2nd', 'Male',
  'Ascent Academy', 'Davis', '2017-09-20', 'New',
  EXTRACT(YEAR FROM NOW())::INTEGER,
  CURRENT_DATE - INTERVAL '3 days',
  false,
  -- Vision: MISSING (required) → INCOMPLETE
  'P', 'P', 'P', 'P', 'P', 'P',  -- Hearing: COMPLETE
  'P',  -- Acanthosis: COMPLETE
  NOW(), NOW()
);

-- ==================================================
-- VERIFY RESULTS - These should all be INCOMPLETE
-- ==================================================

SELECT 
    s.unique_id,
    s.first_name,
    s.last_name,
    s.grade,
    s.gender,
    s.status,
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
        WHEN sr.was_absent THEN 'ABSENT'
        WHEN sr.unique_id IS NULL THEN 'NOT STARTED'
        WHEN (NOT sr.vision_required OR sr.vision_complete) AND
             (NOT sr.hearing_required OR sr.hearing_complete) AND
             (NOT sr.acanthosis_required OR sr.acanthosis_complete) AND
             (NOT sr.scoliosis_required OR sr.scoliosis_complete)
        THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as calculated_status
FROM students s
LEFT JOIN screening_results sr ON s.unique_id = sr.unique_id
WHERE s.unique_id IN ('as0011', 'as0012', 'as0013')
ORDER BY s.unique_id;

