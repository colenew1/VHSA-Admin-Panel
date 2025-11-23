-- ==================================================
-- Add vision_overall and hearing_overall columns
-- ==================================================
-- These columns store the screener's explicit pass/fail determination
-- The screener's input is the source of truth, not calculated values
-- ==================================================

-- Add vision_overall column (stores 'P' for Pass, 'F' for Fail, or NULL)
ALTER TABLE screening_results
ADD COLUMN IF NOT EXISTS vision_overall TEXT;

-- Add hearing_overall column (stores 'P' for Pass, 'F' for Fail, or NULL)
ALTER TABLE screening_results
ADD COLUMN IF NOT EXISTS hearing_overall TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN screening_results.vision_overall IS 'Screener''s explicit overall vision pass/fail determination (P/F). This is the source of truth, not calculated.';
COMMENT ON COLUMN screening_results.hearing_overall IS 'Screener''s explicit overall hearing pass/fail determination (P/F). This is the source of truth, not calculated.';

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'screening_results'
  AND column_name IN ('vision_overall', 'hearing_overall')
ORDER BY column_name;

