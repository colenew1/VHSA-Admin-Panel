-- Fix missing test data to make *_complete fields evaluate to true
-- This will update records to have all required fields filled

-- 1. Fix Vision: Add left eye values where right eye exists but left is missing
UPDATE screening_results
SET 
    vision_initial_left_eye = vision_initial_right_eye
WHERE student_school = 'Ascent Academy'
AND vision_initial_right_eye IS NOT NULL
AND vision_initial_left_eye IS NULL
AND vision_initial_right_eye != '';

-- 2. Fix Hearing: Add missing frequency values
-- For students with some hearing data, fill in missing frequencies with 'P' (Pass)
UPDATE screening_results
SET 
    -- If right 1000 exists but others don't, fill them
    hearing_initial_right_2000 = COALESCE(hearing_initial_right_2000, hearing_initial_right_1000, 'P'),
    hearing_initial_right_4000 = COALESCE(hearing_initial_right_4000, hearing_initial_right_1000, 'P'),
    hearing_initial_left_1000 = COALESCE(hearing_initial_left_1000, hearing_initial_right_1000, 'P'),
    hearing_initial_left_2000 = COALESCE(hearing_initial_left_2000, hearing_initial_right_1000, 'P'),
    hearing_initial_left_4000 = COALESCE(hearing_initial_left_4000, hearing_initial_right_1000, 'P'),
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND hearing_initial_right_1000 IS NOT NULL
AND (
    hearing_initial_right_2000 IS NULL OR
    hearing_initial_right_4000 IS NULL OR
    hearing_initial_left_1000 IS NULL OR
    hearing_initial_left_2000 IS NULL OR
    hearing_initial_left_4000 IS NULL
);

-- 3. For students with vision but no hearing data, add hearing data
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
AND vision_initial_right_eye IS NOT NULL
AND hearing_initial_right_1000 IS NULL
AND hearing_required = true;

-- 4. For students with vision and hearing but missing acanthosis, add it
UPDATE screening_results
SET 
    acanthosis_initial_result = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND vision_initial_right_eye IS NOT NULL
AND hearing_initial_right_1000 IS NOT NULL
AND acanthosis_initial_result IS NULL
AND acanthosis_required = true;

-- 5. For students with vision, hearing, acanthosis but missing scoliosis, add it
UPDATE screening_results
SET 
    scoliosis_initial_result = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND vision_initial_right_eye IS NOT NULL
AND hearing_initial_right_1000 IS NOT NULL
AND acanthosis_initial_result IS NOT NULL
AND scoliosis_initial_result IS NULL
AND scoliosis_required = true;

-- Verify the updates
SELECT 
    student_first_name,
    student_last_name,
    vision_initial_right_eye,
    vision_initial_left_eye,
    vision_complete,
    hearing_initial_right_1000,
    hearing_initial_right_2000,
    hearing_initial_right_4000,
    hearing_initial_left_1000,
    hearing_initial_left_2000,
    hearing_initial_left_4000,
    hearing_complete,
    acanthosis_initial_result,
    acanthosis_complete,
    scoliosis_initial_result,
    scoliosis_complete
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_first_name;

