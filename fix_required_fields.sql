-- Check if *_required fields are generated columns
SELECT 
    column_name,
    is_generated,
    generation_expression,
    column_default
FROM information_schema.columns
WHERE table_name = 'screening_results'
AND column_name LIKE '%_required'
ORDER BY column_name;

-- Check current values of *_required fields
SELECT 
    unique_id,
    student_first_name,
    student_last_name,
    student_grade,
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required,
    vision_complete,
    hearing_complete,
    acanthosis_complete,
    scoliosis_complete
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY unique_id;

-- If *_required are NOT generated, we need to set them based on grade
-- This is a helper query to see what should be required for each grade
SELECT DISTINCT
    student_grade,
    COUNT(*) as count
FROM screening_results
WHERE student_school = 'Ascent Academy'
GROUP BY student_grade;

