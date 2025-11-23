/**
 * Calculate if vision test is complete based on actual field values
 * Vision is complete if BOTH right and left eye values are filled (initial OR rescreen)
 */
export function isVisionComplete(screeningRow) {
  if (!screeningRow) return false;
  
  const hasRightEye = (
    (screeningRow.vision_initial_right_eye && screeningRow.vision_initial_right_eye.trim() !== '') ||
    (screeningRow.vision_rescreen_right_eye && screeningRow.vision_rescreen_right_eye.trim() !== '')
  );
  
  const hasLeftEye = (
    (screeningRow.vision_initial_left_eye && screeningRow.vision_initial_left_eye.trim() !== '') ||
    (screeningRow.vision_rescreen_left_eye && screeningRow.vision_rescreen_left_eye.trim() !== '')
  );
  
  return hasRightEye && hasLeftEye;
}

/**
 * Calculate if hearing test is complete based on actual field values
 * Hearing is complete if ALL 6 frequency values are filled (initial OR rescreen)
 */
export function isHearingComplete(screeningRow) {
  if (!screeningRow) return false;
  
  const hasRight1000 = (
    (screeningRow.hearing_initial_right_1000 && screeningRow.hearing_initial_right_1000.trim() !== '') ||
    (screeningRow.hearing_rescreen_right_1000 && screeningRow.hearing_rescreen_right_1000.trim() !== '')
  );
  
  const hasRight2000 = (
    (screeningRow.hearing_initial_right_2000 && screeningRow.hearing_initial_right_2000.trim() !== '') ||
    (screeningRow.hearing_rescreen_right_2000 && screeningRow.hearing_rescreen_right_2000.trim() !== '')
  );
  
  const hasRight4000 = (
    (screeningRow.hearing_initial_right_4000 && screeningRow.hearing_initial_right_4000.trim() !== '') ||
    (screeningRow.hearing_rescreen_right_4000 && screeningRow.hearing_rescreen_right_4000.trim() !== '')
  );
  
  const hasLeft1000 = (
    (screeningRow.hearing_initial_left_1000 && screeningRow.hearing_initial_left_1000.trim() !== '') ||
    (screeningRow.hearing_rescreen_left_1000 && screeningRow.hearing_rescreen_left_1000.trim() !== '')
  );
  
  const hasLeft2000 = (
    (screeningRow.hearing_initial_left_2000 && screeningRow.hearing_initial_left_2000.trim() !== '') ||
    (screeningRow.hearing_rescreen_left_2000 && screeningRow.hearing_rescreen_left_2000.trim() !== '')
  );
  
  const hasLeft4000 = (
    (screeningRow.hearing_initial_left_4000 && screeningRow.hearing_initial_left_4000.trim() !== '') ||
    (screeningRow.hearing_rescreen_left_4000 && screeningRow.hearing_rescreen_left_4000.trim() !== '')
  );
  
  return hasRight1000 && hasRight2000 && hasRight4000 && hasLeft1000 && hasLeft2000 && hasLeft4000;
}

/**
 * Calculate if acanthosis test is complete based on actual field values
 * Acanthosis is complete if result is filled (initial OR rescreen)
 */
export function isAcanthosisComplete(screeningRow) {
  if (!screeningRow) return false;
  
  return (
    (screeningRow.acanthosis_initial_result && screeningRow.acanthosis_initial_result.trim() !== '') ||
    (screeningRow.acanthosis_rescreen_result && screeningRow.acanthosis_rescreen_result.trim() !== '')
  );
}

/**
 * Calculate if scoliosis test is complete based on actual field values
 * Scoliosis is complete if result is filled (initial OR rescreen)
 */
export function isScoliosisComplete(screeningRow) {
  if (!screeningRow) return false;
  
  return (
    (screeningRow.scoliosis_initial_result && screeningRow.scoliosis_initial_result.trim() !== '') ||
    (screeningRow.scoliosis_rescreen_result && screeningRow.scoliosis_rescreen_result.trim() !== '')
  );
}

/**
 * Calculate if all required tests are complete
 * Returns true only if ALL required tests have ALL their fields filled
 */
export function areAllRequiredTestsComplete(screeningRow) {
  if (!screeningRow) return false;
  
  const visionComplete = !screeningRow.vision_required || isVisionComplete(screeningRow);
  const hearingComplete = !screeningRow.hearing_required || isHearingComplete(screeningRow);
  const acanthosisComplete = !screeningRow.acanthosis_required || isAcanthosisComplete(screeningRow);
  const scoliosisComplete = !screeningRow.scoliosis_required || isScoliosisComplete(screeningRow);
  
  return visionComplete && hearingComplete && acanthosisComplete && scoliosisComplete;
}

