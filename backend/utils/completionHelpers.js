/**
 * Calculate if all required tests are complete based on state requirements
 * Uses the database's *_complete columns (generated columns that check if all fields are filled)
 * Returns true only if ALL required tests for that grade are complete
 * 
 * IMPORTANT: Extra screenings (non-required tests) do NOT substitute for required tests.
 * A student remains INCOMPLETE until ALL required tests are done.
 * 
 * Example: Kindergarten requires Vision and Hearing only
 * - If vision_complete=true and hearing_complete=true → COMPLETE
 * - If vision_complete=true but hearing_complete=false → INCOMPLETE (even if they did acanthosis)
 * - If vision_complete=false and hearing_complete=false → INCOMPLETE (even if they did acanthosis)
 */
export function areAllRequiredTestsComplete(screeningRow) {
  if (!screeningRow) return false;
  
  // Use the database's *_complete columns directly
  // These are generated columns that check if all required fields are filled
  // *_required columns are set based on grade and state requirements
  
  // For each test:
  // - If NOT required (*_required = false): ignore it (doesn't matter if complete or not)
  // - If REQUIRED (*_required = true): MUST be complete (*_complete = true)
  // Extra screenings (non-required tests) do NOT count as substitutes
  const visionComplete = !screeningRow.vision_required || screeningRow.vision_complete;
  const hearingComplete = !screeningRow.hearing_required || screeningRow.hearing_complete;
  const acanthosisComplete = !screeningRow.acanthosis_required || screeningRow.acanthosis_complete;
  const scoliosisComplete = !screeningRow.scoliosis_required || screeningRow.scoliosis_complete;
  
  // All required tests must be complete - no exceptions, no substitutions
  return visionComplete && hearingComplete && acanthosisComplete && scoliosisComplete;
}

