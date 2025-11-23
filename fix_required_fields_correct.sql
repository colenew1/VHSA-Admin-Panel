-- CORRECTED: Update *_required fields based on EXACT grade-based logic
-- This matches the logic in backend/routes/exports.js getRequiredScreenings()

-- First, let's see what we currently have
SELECT 
    student_first_name,
    student_last_name,
    student_grade,
    student_gender,
    student_status,
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_grade, student_first_name;

-- Now update based on CORRECT grade logic:
-- Kindergarten: V, H only (NO A, NO S)
-- 1st: V, H, A (always)
-- 2nd: V, H, A (new students only)
-- 3rd: V, H, A (always)
-- 4th: V, H, A (new students only)
-- 5th: V, H, A (always) + S (girls only)
-- 6th: V, H, A (new students only)
-- 7th: V, H, A (always) + S (girls only)
-- 8th: V, H, A (new students only) + S (boys only)
-- 9th-12th: V, H, A (new students only)

UPDATE screening_results
SET 
    vision_required = CASE 
        -- Kindergarten and above always need vision
        WHEN student_grade IN ('Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') THEN true
        ELSE false
    END,
    hearing_required = CASE 
        -- Kindergarten and above always need hearing
        WHEN student_grade IN ('Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') THEN true
        ELSE false
    END,
    acanthosis_required = CASE 
        -- Kindergarten: NO acanthosis
        WHEN student_grade = 'Kindergarten' THEN false
        -- 1st, 3rd, 5th, 7th: Always required
        WHEN student_grade IN ('1st', '3rd', '5th', '7th') THEN true
        -- 2nd, 4th, 6th, 8th, 9th-12th: Only for new students
        WHEN student_grade IN ('2nd', '4th', '6th', '8th', '9th', '10th', '11th', '12th') AND student_status = 'New' THEN true
        ELSE false
    END,
    scoliosis_required = CASE 
        -- 5th grade: Girls only
        WHEN student_grade = '5th' AND student_gender = 'Female' THEN true
        -- 7th grade: Girls only
        WHEN student_grade = '7th' AND student_gender = 'Female' THEN true
        -- 8th grade: Boys only, new students only
        WHEN student_grade = '8th' AND student_gender = 'Male' AND student_status = 'New' THEN true
        ELSE false
    END,
    updated_at = NOW()
WHERE student_school = 'Ascent Academy';

-- Verify the update matches the logic
SELECT 
    student_first_name,
    student_last_name,
    student_grade,
    student_gender,
    student_status,
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required,
    -- Show what should be required based on logic
    CASE 
        WHEN student_grade IN ('Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') THEN 'V'
        ELSE ''
    END || 
    CASE 
        WHEN student_grade IN ('Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') THEN ' H'
        ELSE ''
    END ||
    CASE 
        WHEN student_grade = 'Kindergarten' THEN ''
        WHEN student_grade IN ('1st', '3rd', '5th', '7th') THEN ' A'
        WHEN student_grade IN ('2nd', '4th', '6th', '8th', '9th', '10th', '11th', '12th') AND student_status = 'New' THEN ' A'
        ELSE ''
    END ||
    CASE 
        WHEN student_grade = '5th' AND student_gender = 'Female' THEN ' S'
        WHEN student_grade = '7th' AND student_gender = 'Female' THEN ' S'
        WHEN student_grade = '8th' AND student_gender = 'Male' AND student_status = 'New' THEN ' S'
        ELSE ''
    END as expected_tests
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_grade, student_first_name;

