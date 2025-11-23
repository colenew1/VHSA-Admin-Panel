-- Diagnostic queries to check screening_results data

-- 1. Check if any screening_results exist for Ascent Academy
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT unique_id) as unique_students,
    MIN(initial_screening_date) as earliest_date,
    MAX(initial_screening_date) as latest_date
FROM screening_results
WHERE student_school = 'Ascent Academy';

-- 2. Check sample records
SELECT 
    unique_id,
    student_first_name,
    student_last_name,
    student_school,
    initial_screening_date,
    was_absent,
    vision_required,
    vision_complete,
    hearing_required,
    hearing_complete,
    acanthosis_required,
    acanthosis_complete,
    scoliosis_required,
    scoliosis_complete
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY initial_screening_date DESC
LIMIT 10;

-- 3. Check if *_required columns are generated (check their definition)
SELECT 
    column_name,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'screening_results'
AND column_name LIKE '%_required'
ORDER BY column_name;

-- 4. Check date range for recent records
SELECT 
    initial_screening_date,
    COUNT(*) as count
FROM screening_results
WHERE student_school = 'Ascent Academy'
GROUP BY initial_screening_date
ORDER BY initial_screening_date DESC;

-- 5. Check if students exist
SELECT 
    COUNT(*) as total_students,
    COUNT(DISTINCT school) as schools
FROM students
WHERE school = 'Ascent Academy';

-- 6. Check if student_id matches between students and screening_results
SELECT 
    s.unique_id,
    s.first_name,
    s.last_name,
    sr.unique_id as screening_unique_id,
    sr.student_id,
    sr.initial_screening_date
FROM students s
LEFT JOIN screening_results sr ON s.unique_id = sr.unique_id
WHERE s.school = 'Ascent Academy'
LIMIT 10;

