-- ==================================================
-- FULL SCOPE OF SCREENING RESULTS - DIAGNOSTIC QUERY
-- ==================================================
-- This query shows ALL relevant fields to understand what data exists
-- and what might be missing in the completion logic

SELECT 
    -- Student identifiers
    s.unique_id,
    s.first_name,
    s.last_name,
    s.grade,
    s.gender,
    s.status as student_status,
    s.school,
    
    -- Screening record identifiers
    sr.id as screening_result_id,
    sr.student_id,
    sr.unique_id as screening_unique_id,
    sr.screening_year,
    sr.initial_screening_date,
    sr.was_absent,
    
    -- Required flags (based on grade/status)
    sr.vision_required,
    sr.hearing_required,
    sr.acanthosis_required,
    sr.scoliosis_required,
    
    -- Complete flags (generated columns - check if all fields filled)
    sr.vision_complete,
    sr.hearing_complete,
    sr.acanthosis_complete,
    sr.scoliosis_complete,
    
    -- Vision data (all fields)
    sr.vision_initial_right_eye,
    sr.vision_initial_left_eye,
    sr.vision_rescreen_right_eye,
    sr.vision_rescreen_left_eye,
    sr.vision_initial_result,
    sr.vision_rescreen_result,
    
    -- Hearing data (all 12 frequency fields)
    sr.hearing_initial_right_1000,
    sr.hearing_initial_right_2000,
    sr.hearing_initial_right_4000,
    sr.hearing_initial_left_1000,
    sr.hearing_initial_left_2000,
    sr.hearing_initial_left_4000,
    sr.hearing_rescreen_right_1000,
    sr.hearing_rescreen_right_2000,
    sr.hearing_rescreen_right_4000,
    sr.hearing_rescreen_left_1000,
    sr.hearing_rescreen_left_2000,
    sr.hearing_rescreen_left_4000,
    sr.hearing_initial_result,
    sr.hearing_rescreen_result,
    
    -- Acanthosis data
    sr.acanthosis_initial_result,
    sr.acanthosis_rescreen_result,
    
    -- Scoliosis data
    sr.scoliosis_initial_result,
    sr.scoliosis_rescreen_result,
    
    -- Calculated status (what the code should determine)
    CASE 
        WHEN sr.was_absent AND 
             (sr.vision_initial_right_eye IS NULL AND sr.vision_initial_left_eye IS NULL AND
              sr.vision_rescreen_right_eye IS NULL AND sr.vision_rescreen_left_eye IS NULL AND
              sr.hearing_initial_right_1000 IS NULL AND sr.hearing_initial_left_1000 IS NULL AND
              sr.acanthosis_initial_result IS NULL AND sr.scoliosis_initial_result IS NULL)
        THEN 'ABSENT'
        WHEN sr.unique_id IS NULL THEN 'NOT STARTED'
        WHEN (NOT sr.vision_required OR sr.vision_complete) AND
             (NOT sr.hearing_required OR sr.hearing_complete) AND
             (NOT sr.acanthosis_required OR sr.acanthosis_complete) AND
             (NOT sr.scoliosis_required OR sr.scoliosis_complete)
        THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as calculated_status,
    
    -- What's missing (for incomplete students)
    CASE 
        WHEN sr.vision_required AND NOT sr.vision_complete THEN 'Missing Vision' ELSE '' 
    END ||
    CASE 
        WHEN sr.hearing_required AND NOT sr.hearing_complete THEN ' Missing Hearing' ELSE '' 
    END ||
    CASE 
        WHEN sr.acanthosis_required AND NOT sr.acanthosis_complete THEN ' Missing Acanthosis' ELSE '' 
    END ||
    CASE 
        WHEN sr.scoliosis_required AND NOT sr.scoliosis_complete THEN ' Missing Scoliosis' ELSE '' 
    END as missing_tests,
    
    -- Has any screening data (for absent override logic)
    CASE 
        WHEN sr.vision_initial_right_eye IS NOT NULL OR sr.vision_initial_left_eye IS NOT NULL OR
             sr.vision_rescreen_right_eye IS NOT NULL OR sr.vision_rescreen_left_eye IS NOT NULL OR
             sr.hearing_initial_right_1000 IS NOT NULL OR sr.hearing_initial_left_1000 IS NOT NULL OR
             sr.acanthosis_initial_result IS NOT NULL OR sr.scoliosis_initial_result IS NOT NULL
        THEN true
        ELSE false
    END as has_any_screening_data

FROM students s
LEFT JOIN screening_results sr ON s.unique_id = sr.unique_id
WHERE s.school = 'Ascent Academy'
ORDER BY s.unique_id, sr.screening_year DESC, sr.initial_screening_date DESC;

