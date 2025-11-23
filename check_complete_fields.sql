-- Check the *_complete fields and test result data
-- This will help us understand why students are showing as incomplete

SELECT 
    unique_id,
    student_first_name,
    student_last_name,
    student_grade,
    -- Required fields
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required,
    -- Complete fields (generated)
    vision_complete,
    hearing_complete,
    acanthosis_complete,
    scoliosis_complete,
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
ORDER BY unique_id;

-- Check if the completion logic matches what we expect
SELECT 
    unique_id,
    student_first_name,
    student_last_name,
    -- Check each test
    vision_required,
    vision_complete,
    CASE WHEN vision_required AND NOT vision_complete THEN 'MISSING VISION' ELSE 'OK' END as vision_status,
    hearing_required,
    hearing_complete,
    CASE WHEN hearing_required AND NOT hearing_complete THEN 'MISSING HEARING' ELSE 'OK' END as hearing_status,
    acanthosis_required,
    acanthosis_complete,
    CASE WHEN acanthosis_required AND NOT acanthosis_complete THEN 'MISSING ACANTHOSIS' ELSE 'OK' END as acanthosis_status,
    scoliosis_required,
    scoliosis_complete,
    CASE WHEN scoliosis_required AND NOT scoliosis_complete THEN 'MISSING SCOLIOSIS' ELSE 'OK' END as scoliosis_status,
    -- Overall status
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
ORDER BY unique_id;

