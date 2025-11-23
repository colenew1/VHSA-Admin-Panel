-- Fix missing test data to make *_complete fields evaluate to true
-- Based on the data shown, we need to fill in missing values

-- 1. Fix Vision: Add left eye values where right eye exists
UPDATE screening_results
SET 
    vision_initial_left_eye = vision_initial_right_eye,
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND vision_initial_right_eye IS NOT NULL
AND vision_initial_left_eye IS NULL;

-- 2. Fix Hearing for students who have some hearing data
-- as0002 (Liam): Has vision but no hearing - add hearing data
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
AND student_first_name = 'Liam'
AND student_last_name = 'Brown'
AND hearing_initial_right_1000 IS NULL;

-- as0005 (Sophia): Has vision and hearing_initial_right_1000='P' but missing other frequencies
UPDATE screening_results
SET 
    hearing_initial_right_2000 = 'P',
    hearing_initial_right_4000 = 'P',
    hearing_initial_left_1000 = 'P',
    hearing_initial_left_2000 = 'P',
    hearing_initial_left_4000 = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND student_first_name = 'Sophia'
AND student_last_name = 'Miller'
AND hearing_initial_right_1000 = 'P';

-- as0009 (Ava): Has vision and acanthosis but no hearing
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
AND student_first_name = 'Ava'
AND student_last_name = 'White'
AND hearing_initial_right_1000 IS NULL;

-- as0010 (James): Has hearing_initial_right_1000='F' but missing other frequencies
UPDATE screening_results
SET 
    hearing_initial_right_2000 = COALESCE(hearing_initial_right_2000, 'P'),
    hearing_initial_right_4000 = COALESCE(hearing_initial_right_4000, 'P'),
    hearing_initial_left_1000 = COALESCE(hearing_initial_left_1000, 'P'),
    hearing_initial_left_2000 = COALESCE(hearing_initial_left_2000, 'P'),
    hearing_initial_left_4000 = COALESCE(hearing_initial_left_4000, 'P'),
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND student_first_name = 'James'
AND student_last_name = 'Martin'
AND hearing_initial_right_1000 = 'F';

-- as0003, as0004, as0006: These have hearing_initial_right_1000='P' but might be missing other frequencies
UPDATE screening_results
SET 
    hearing_initial_right_2000 = COALESCE(hearing_initial_right_2000, 'P'),
    hearing_initial_right_4000 = COALESCE(hearing_initial_right_4000, 'P'),
    hearing_initial_left_1000 = COALESCE(hearing_initial_left_1000, 'P'),
    hearing_initial_left_2000 = COALESCE(hearing_initial_left_2000, 'P'),
    hearing_initial_left_4000 = COALESCE(hearing_initial_left_4000, 'P'),
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND hearing_initial_right_1000 = 'P'
AND (
    hearing_initial_right_2000 IS NULL OR
    hearing_initial_right_4000 IS NULL OR
    hearing_initial_left_1000 IS NULL OR
    hearing_initial_left_2000 IS NULL OR
    hearing_initial_left_4000 IS NULL
);

-- 3. Fix missing acanthosis for students who should have it
UPDATE screening_results
SET 
    acanthosis_initial_result = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND acanthosis_required = true
AND acanthosis_initial_result IS NULL
AND vision_initial_right_eye IS NOT NULL; -- Only for students who have started screening

-- 4. Fix missing scoliosis for students who should have it
UPDATE screening_results
SET 
    scoliosis_initial_result = 'P',
    updated_at = NOW()
WHERE student_school = 'Ascent Academy'
AND scoliosis_required = true
AND scoliosis_initial_result IS NULL
AND vision_initial_right_eye IS NOT NULL; -- Only for students who have started screening

-- Verify the results
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
    scoliosis_complete,
    was_absent
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_first_name;

