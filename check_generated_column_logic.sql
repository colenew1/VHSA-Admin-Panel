-- Check the generated column expressions to understand the logic
SELECT 
    column_name,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'screening_results'
AND column_name LIKE '%_complete'
ORDER BY column_name;

-- Check what fields vision_complete is checking for
-- Vision might need BOTH right and left eye values
SELECT 
    student_first_name,
    student_last_name,
    vision_initial_right_eye,
    vision_initial_left_eye,
    vision_rescreen_right_eye,
    vision_rescreen_left_eye,
    vision_complete,
    CASE 
        WHEN vision_initial_right_eye IS NOT NULL OR vision_initial_left_eye IS NOT NULL OR
             vision_rescreen_right_eye IS NOT NULL OR vision_rescreen_left_eye IS NOT NULL
        THEN 'Has vision data'
        ELSE 'No vision data'
    END as vision_data_check
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_first_name;

-- Check what fields hearing_complete is checking for
-- Hearing might need ALL 6 frequency values (right 1000, 2000, 4000 and left 1000, 2000, 4000)
SELECT 
    student_first_name,
    student_last_name,
    hearing_initial_right_1000,
    hearing_initial_right_2000,
    hearing_initial_right_4000,
    hearing_initial_left_1000,
    hearing_initial_left_2000,
    hearing_initial_left_4000,
    hearing_rescreen_right_1000,
    hearing_rescreen_right_2000,
    hearing_rescreen_right_4000,
    hearing_rescreen_left_1000,
    hearing_rescreen_left_2000,
    hearing_rescreen_left_4000,
    hearing_complete,
    CASE 
        WHEN (hearing_initial_right_1000 IS NOT NULL OR hearing_rescreen_right_1000 IS NOT NULL) AND
             (hearing_initial_right_2000 IS NOT NULL OR hearing_rescreen_right_2000 IS NOT NULL) AND
             (hearing_initial_right_4000 IS NOT NULL OR hearing_rescreen_right_4000 IS NOT NULL) AND
             (hearing_initial_left_1000 IS NOT NULL OR hearing_rescreen_left_1000 IS NOT NULL) AND
             (hearing_initial_left_2000 IS NOT NULL OR hearing_rescreen_left_2000 IS NOT NULL) AND
             (hearing_initial_left_4000 IS NOT NULL OR hearing_rescreen_left_4000 IS NOT NULL)
        THEN 'Has all hearing data'
        ELSE 'Missing hearing data'
    END as hearing_data_check
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY student_first_name;

