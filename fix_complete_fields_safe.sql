-- SAFE FIX: Only fill in missing test data, respecting grade-based requirements
-- This will NOT override the grade logic - it only fills missing data where tests are REQUIRED

-- Step 1: First, ensure *_required fields are set correctly based on grade
-- (This should already be done, but let's verify and fix if needed)
UPDATE screening_results
SET 
    vision_required = CASE 
        WHEN student_grade IN ('Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') THEN true
        ELSE false
    END,
    hearing_required = CASE 
        WHEN student_grade IN ('Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') THEN true
        ELSE false
    END,
    acanthosis_required = CASE 
        WHEN student_grade = 'Kindergarten' THEN false
        WHEN student_grade IN ('1st', '3rd', '5th', '7th') THEN true
        WHEN student_grade IN ('2nd', '4th', '6th', '8th', '9th', '10th', '11th', '12th') AND student_status = 'New' THEN true
        ELSE false
    END,
    scoliosis_required = CASE 
        WHEN student_grade = '5th' AND student_gender = 'Female' THEN true
        WHEN student_grade = '7th' AND student_gender = 'Female' THEN true
        WHEN student_grade = '8th' AND student_gender = 'Male' AND student_status = 'New' THEN true
        ELSE false
    END,
    updated_at = NOW()
WHERE student_school = 'Ascent Academy';

-- Step 2: Fix Vision - Add left eye values where right eye exists (for vision_complete to be true)
UPDATE screening_results
SET 
    vision_initial_left_eye = vision_initial_right_eye,
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND vision_required = true
AND vision_initial_right_eye IS NOT NULL
AND vision_initial_left_eye IS NULL;

-- Step 3: Fix Hearing - Only fill in missing frequencies for students who:
-- a) Have hearing_required = true
-- b) Have started hearing screening (have at least one frequency value)
UPDATE screening_results
SET 
    hearing_initial_right_2000 = COALESCE(hearing_initial_right_2000, hearing_initial_right_1000, 'P'),
    hearing_initial_right_4000 = COALESCE(hearing_initial_right_4000, hearing_initial_right_1000, 'P'),
    hearing_initial_left_1000 = COALESCE(hearing_initial_left_1000, hearing_initial_right_1000, 'P'),
    hearing_initial_left_2000 = COALESCE(hearing_initial_left_2000, hearing_initial_right_1000, 'P'),
    hearing_initial_left_4000 = COALESCE(hearing_initial_left_4000, hearing_initial_right_1000, 'P'),
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND hearing_required = true
AND hearing_initial_right_1000 IS NOT NULL
AND (
    hearing_initial_right_2000 IS NULL OR
    hearing_initial_right_4000 IS NULL OR
    hearing_initial_left_1000 IS NULL OR
    hearing_initial_left_2000 IS NULL OR
    hearing_initial_left_4000 IS NULL
);

-- Step 4: For students with vision but no hearing data yet, add hearing data ONLY if hearing is required
UPDATE screening_results
SET 
    hearing_initial_right_1000 = 'P',
    hearing_initial_right_2000 = 'P',
    hearing_initial_right_4000 = 'P',
    hearing_initial_left_1000 = 'P',
    hearing_initial_left_2000 = 'P',
    hearing_initial_left_4000 = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND hearing_required = true
AND vision_initial_right_eye IS NOT NULL
AND hearing_initial_right_1000 IS NULL
AND NOT was_absent;

-- Step 5: Add acanthosis data ONLY if acanthosis is required and student has started screening
UPDATE screening_results
SET 
    acanthosis_initial_result = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND acanthosis_required = true
AND acanthosis_initial_result IS NULL
AND vision_initial_right_eye IS NOT NULL
AND NOT was_absent;

-- Step 6: Add scoliosis data ONLY if scoliosis is required and student has started screening
UPDATE screening_results
SET 
    scoliosis_initial_result = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND scoliosis_required = true
AND scoliosis_initial_result IS NULL
AND vision_initial_right_eye IS NOT NULL
AND NOT was_absent;

-- Step 7: Verify the results - show what's required vs what's complete
SELECT 
    student_first_name,
    student_last_name,
    student_grade,
    student_gender,
    student_status,
    was_absent,
    -- Required
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required,
    -- Complete (generated)
    vision_complete,
    hearing_complete,
    acanthosis_complete,
    scoliosis_complete,
    -- Status check
    CASE 
        WHEN was_absent THEN 'ABSENT'
        WHEN (NOT vision_required OR vision_complete) AND
             (NOT hearing_required OR hearing_complete) AND
             (NOT acanthosis_required OR acanthosis_complete) AND
             (NOT scoliosis_required OR scoliosis_complete)
        THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as overall_status,
    -- Show what's missing
    CASE WHEN vision_required AND NOT vision_complete THEN 'Missing Vision' ELSE '' END ||
    CASE WHEN hearing_required AND NOT hearing_complete THEN ' Missing Hearing' ELSE '' END ||
    CASE WHEN acanthosis_required AND NOT acanthosis_complete THEN ' Missing Acanthosis' ELSE '' END ||
    CASE WHEN scoliosis_required AND NOT scoliosis_complete THEN ' Missing Scoliosis' ELSE '' END as missing_tests
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_grade, student_first_name;

