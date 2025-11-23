-- ==================================================
-- FIX GENERATED COLUMN LOGIC FOR *_complete FIELDS
-- ==================================================
-- The current logic checks *_result fields, but should check actual test data fields
-- Vision needs BOTH right and left eye values
-- Hearing needs ALL 6 frequency values
-- Acanthosis and Scoliosis need their result fields (these are correct)

-- Drop existing generated columns
ALTER TABLE screening_results 
  DROP COLUMN IF EXISTS vision_complete,
  DROP COLUMN IF EXISTS hearing_complete,
  DROP COLUMN IF EXISTS acanthosis_complete,
  DROP COLUMN IF EXISTS scoliosis_complete;

-- Recreate vision_complete: true only if BOTH right and left eye values are filled (initial OR rescreen)
ALTER TABLE screening_results
  ADD COLUMN vision_complete BOOLEAN GENERATED ALWAYS AS (
    -- Must have BOTH right and left eye values (can be initial or rescreen)
    (
      (vision_initial_right_eye IS NOT NULL AND vision_initial_right_eye != '') OR
      (vision_rescreen_right_eye IS NOT NULL AND vision_rescreen_right_eye != '')
    ) AND (
      (vision_initial_left_eye IS NOT NULL AND vision_initial_left_eye != '') OR
      (vision_rescreen_left_eye IS NOT NULL AND vision_rescreen_left_eye != '')
    )
  ) STORED;

-- Recreate hearing_complete: true only if ALL 6 frequencies are filled (initial OR rescreen)
ALTER TABLE screening_results
  ADD COLUMN hearing_complete BOOLEAN GENERATED ALWAYS AS (
    -- Must have ALL 6 frequencies (can be initial or rescreen)
    (
      (hearing_initial_right_1000 IS NOT NULL AND hearing_initial_right_1000 != '') OR
      (hearing_rescreen_right_1000 IS NOT NULL AND hearing_rescreen_right_1000 != '')
    ) AND (
      (hearing_initial_right_2000 IS NOT NULL AND hearing_initial_right_2000 != '') OR
      (hearing_rescreen_right_2000 IS NOT NULL AND hearing_rescreen_right_2000 != '')
    ) AND (
      (hearing_initial_right_4000 IS NOT NULL AND hearing_initial_right_4000 != '') OR
      (hearing_rescreen_right_4000 IS NOT NULL AND hearing_rescreen_right_4000 != '')
    ) AND (
      (hearing_initial_left_1000 IS NOT NULL AND hearing_initial_left_1000 != '') OR
      (hearing_rescreen_left_1000 IS NOT NULL AND hearing_rescreen_left_1000 != '')
    ) AND (
      (hearing_initial_left_2000 IS NOT NULL AND hearing_initial_left_2000 != '') OR
      (hearing_rescreen_left_2000 IS NOT NULL AND hearing_rescreen_left_2000 != '')
    ) AND (
      (hearing_initial_left_4000 IS NOT NULL AND hearing_initial_left_4000 != '') OR
      (hearing_rescreen_left_4000 IS NOT NULL AND hearing_rescreen_left_4000 != '')
    )
  ) STORED;

-- Recreate acanthosis_complete: true only if result is filled (initial OR rescreen)
-- This one is already correct, but keeping it consistent
ALTER TABLE screening_results
  ADD COLUMN acanthosis_complete BOOLEAN GENERATED ALWAYS AS (
    (acanthosis_initial_result IS NOT NULL AND acanthosis_initial_result != '') OR
    (acanthosis_rescreen_result IS NOT NULL AND acanthosis_rescreen_result != '')
  ) STORED;

-- Recreate scoliosis_complete: true only if result is filled (initial OR rescreen)
-- This one is already correct, but keeping it consistent
ALTER TABLE screening_results
  ADD COLUMN scoliosis_complete BOOLEAN GENERATED ALWAYS AS (
    (scoliosis_initial_result IS NOT NULL AND scoliosis_initial_result != '') OR
    (scoliosis_rescreen_result IS NOT NULL AND scoliosis_rescreen_result != '')
  ) STORED;

-- ==================================================
-- VERIFY THE FIX
-- ==================================================

-- Check the new generated column expressions
SELECT 
    column_name,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'screening_results'
AND column_name LIKE '%_complete'
ORDER BY column_name;

-- Test with sample data
SELECT 
    unique_id,
    student_first_name,
    student_last_name,
    student_grade,
    -- Vision
    vision_initial_right_eye,
    vision_initial_left_eye,
    vision_rescreen_right_eye,
    vision_rescreen_left_eye,
    vision_complete,
    vision_required,
    -- Hearing (showing a few key ones)
    hearing_initial_right_1000,
    hearing_initial_left_1000,
    hearing_complete,
    hearing_required,
    -- Overall status
    CASE 
        WHEN was_absent AND 
             (vision_initial_right_eye IS NULL AND vision_initial_left_eye IS NULL AND
              hearing_initial_right_1000 IS NULL AND hearing_initial_left_1000 IS NULL AND
              acanthosis_initial_result IS NULL AND scoliosis_initial_result IS NULL)
        THEN 'ABSENT'
        WHEN (NOT vision_required OR vision_complete) AND
             (NOT hearing_required OR hearing_complete) AND
             (NOT acanthosis_required OR acanthosis_complete) AND
             (NOT scoliosis_required OR scoliosis_complete)
        THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as calculated_status
FROM screening_results
WHERE student_school = 'Ascent Academy'
ORDER BY unique_id
LIMIT 10;

