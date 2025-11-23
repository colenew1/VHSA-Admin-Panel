-- Check if the data will show up in dashboard queries
-- This simulates what the dashboard API does

-- 1. Check what the dashboard would see with different date ranges
SELECT 
    'Last 7 days' as date_range,
    COUNT(*) as total_records,
    COUNT(CASE WHEN was_absent THEN 1 END) as absent_count,
    COUNT(CASE WHEN NOT was_absent THEN 1 END) as non_absent_count
FROM screening_results
WHERE student_school = 'Ascent Academy'
AND initial_screening_date >= CURRENT_DATE - INTERVAL '7 days'
AND initial_screening_date <= CURRENT_DATE;

-- 2. Check the *_required fields (these determine if tests are needed)
SELECT 
    unique_id,
    student_first_name,
    student_last_name,
    vision_required,
    hearing_required,
    acanthosis_required,
    scoliosis_required,
    vision_complete,
    hearing_complete,
    acanthosis_complete,
    scoliosis_complete,
    initial_screening_date
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY initial_screening_date DESC;

-- 3. Check if *_required fields are NULL (this would cause dashboard logic to fail)
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN vision_required IS NULL THEN 1 END) as vision_required_null,
    COUNT(CASE WHEN hearing_required IS NULL THEN 1 END) as hearing_required_null,
    COUNT(CASE WHEN acanthosis_required IS NULL THEN 1 END) as acanthosis_required_null,
    COUNT(CASE WHEN scoliosis_required IS NULL THEN 1 END) as scoliosis_required_null
FROM screening_results
WHERE student_school = 'Ascent Academy';

-- 4. Simulate dashboard query with today's date range
SELECT 
    student_school,
    COUNT(*) as total,
    COUNT(CASE WHEN was_absent THEN 1 END) as absent,
    COUNT(CASE WHEN NOT was_absent AND 
        (NOT vision_required OR vision_complete) AND
        (NOT hearing_required OR hearing_complete) AND
        (NOT acanthosis_required OR acanthosis_complete) AND
        (NOT scoliosis_required OR scoliosis_complete)
    THEN 1 END) as completed,
    COUNT(CASE WHEN NOT was_absent AND NOT (
        (NOT vision_required OR vision_complete) AND
        (NOT hearing_required OR hearing_complete) AND
        (NOT acanthosis_required OR acanthosis_complete) AND
        (NOT scoliosis_required OR scoliosis_complete)
    ) THEN 1 END) as incomplete
FROM screening_results
WHERE student_school = 'Ascent Academy'
AND initial_screening_date >= CURRENT_DATE - INTERVAL '7 days'
AND initial_screening_date <= CURRENT_DATE
GROUP BY student_school;

