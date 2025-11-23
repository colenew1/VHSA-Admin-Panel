-- First, check what columns actually exist in screening_results
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'screening_results'
AND (column_name LIKE '%complete%' OR column_name LIKE '%vision%' OR column_name LIKE '%hearing%' OR column_name LIKE '%acanthosis%' OR column_name LIKE '%scoliosis%')
ORDER BY column_name;

-- Now check the complete fields and test result data using correct column names
SELECT 
    student_id,
    student_first_name,
    student_last_name,
    student_grade,
    -- Complete fields (generated)
    vision_complete,
    hearing_complete,
    acanthosis_complete,
    scoliosis_complete,
    -- Required fields
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required,
    -- Actual test result data
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
    was_absent
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_first_name, student_last_name;

-- Check completion status logic
SELECT 
    student_first_name || ' ' || student_last_name as name,
    student_grade,
    was_absent,
    -- Vision
    vision_required,
    vision_complete,
    vision_initial_right_eye,
    vision_initial_left_eye,
    CASE WHEN vision_required AND NOT vision_complete THEN '❌ Missing Vision' ELSE '✅' END as vision_check,
    -- Hearing
    hearing_required,
    hearing_complete,
    hearing_initial_right_1000,
    CASE WHEN hearing_required AND NOT hearing_complete THEN '❌ Missing Hearing' ELSE '✅' END as hearing_check,
    -- Acanthosis
    acanthosis_required,
    acanthosis_complete,
    acanthosis_initial_result,
    CASE WHEN acanthosis_required AND NOT acanthosis_complete THEN '❌ Missing Acanthosis' ELSE '✅' END as acanthosis_check,
    -- Scoliosis
    scoliosis_required,
    scoliosis_complete,
    scoliosis_initial_result,
    CASE WHEN scoliosis_required AND NOT scoliosis_complete THEN '❌ Missing Scoliosis' ELSE '✅' END as scoliosis_check,
    -- Overall
    CASE 
        WHEN was_absent THEN 'ABSENT'
        WHEN (NOT vision_required OR vision_complete) AND
             (NOT hearing_required OR hearing_complete) AND
             (NOT acanthosis_required OR acanthosis_complete) AND
             (NOT scoliosis_required OR scoliosis_complete)
        THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as overall_status
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_first_name, student_last_name;

