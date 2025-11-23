-- Update *_required fields for Ascent Academy students
-- These fields determine which tests are needed based on grade
-- If they're NULL, the dashboard logic will fail

-- First, check current state
SELECT 
    unique_id,
    student_grade,
    student_gender,
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY unique_id;

-- Update based on grade requirements:
-- Kindergarten-12th: Vision and Hearing always required
-- 1st, 3rd, 5th, 7th: Acanthosis required
-- 2nd, 4th, 6th, 8th (new students only): Acanthosis required
-- 5th, 7th (girls): Scoliosis required
-- 8th (boys, new students only): Scoliosis required

UPDATE screening_results
SET 
    vision_required = true,
    hearing_required = true,
    acanthosis_required = CASE 
        WHEN student_grade IN ('1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th') THEN true
        ELSE false
    END,
    scoliosis_required = CASE 
        WHEN (student_grade = '5th' AND student_gender = 'Female') THEN true
        WHEN (student_grade = '7th' AND student_gender = 'Female') THEN true
        WHEN (student_grade = '8th' AND student_gender = 'Male' AND student_status = 'New') THEN true
        ELSE false
    END,
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND (vision_required IS NULL OR hearing_required IS NULL OR acanthosis_required IS NULL OR scoliosis_required IS NULL);

-- Verify the update
SELECT 
    unique_id,
    student_grade,
    student_gender,
    student_status,
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY unique_id;

