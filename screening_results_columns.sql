-- ==================================================
-- FULL SCOPE OF SCREENING_RESULTS TABLE COLUMNS
-- ==================================================
-- This query shows ALL column names in the screening_results table
-- to verify we're checking all the right fields in the code

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name LIKE '%_complete' THEN 'GENERATED COLUMN (calculated)'
        WHEN column_name LIKE '%_required' THEN 'GENERATED COLUMN (calculated)'
        ELSE 'REGULAR COLUMN'
    END as column_type
FROM information_schema.columns
WHERE table_name = 'screening_results'
ORDER BY 
    CASE 
        -- Group by category
        WHEN column_name IN ('id', 'student_id', 'unique_id') THEN 1
        WHEN column_name LIKE 'student_%' THEN 2
        WHEN column_name LIKE 'screening_%' OR column_name = 'initial_screening_date' THEN 3
        WHEN column_name = 'was_absent' OR column_name = 'absence_date' OR column_name = 'makeup_date' THEN 4
        WHEN column_name LIKE '%_required' THEN 5
        WHEN column_name LIKE '%_complete' THEN 6
        WHEN column_name LIKE 'vision_%' THEN 7
        WHEN column_name LIKE 'hearing_%' THEN 8
        WHEN column_name LIKE 'acanthosis_%' THEN 9
        WHEN column_name LIKE 'scoliosis_%' THEN 10
        WHEN column_name LIKE '%_notes' THEN 11
        WHEN column_name IN ('created_at', 'updated_at') THEN 12
        ELSE 13
    END,
    column_name;

