/**
 * Status helper utilities for screening data
 */

/**
 * Check if any test has failed (returns "F" or "FAIL")
 */
export function hasFailedTest(student) {
  const isFail = (value) => {
    if (!value) return false;
    const normalized = value.toString().toUpperCase().trim();
    return normalized === 'F' || normalized === 'FAIL';
  };

  return (
    isFail(student.vision_initial_right) || 
    isFail(student.vision_initial_left) ||
    isFail(student.vision_rescreen_right) || 
    isFail(student.vision_rescreen_left) ||
    isFail(student.vision_overall) ||
    isFail(student.hearing_initial_right_1000) ||
    isFail(student.hearing_initial_right_2000) ||
    isFail(student.hearing_initial_right_4000) ||
    isFail(student.hearing_initial_left_1000) ||
    isFail(student.hearing_initial_left_2000) ||
    isFail(student.hearing_initial_left_4000) ||
    isFail(student.hearing_rescreen_right_1000) ||
    isFail(student.hearing_rescreen_right_2000) ||
    isFail(student.hearing_rescreen_right_4000) ||
    isFail(student.hearing_rescreen_left_1000) ||
    isFail(student.hearing_rescreen_left_2000) ||
    isFail(student.hearing_rescreen_left_4000) ||
    isFail(student.hearing_overall) ||
    isFail(student.acanthosis_initial) || 
    isFail(student.acanthosis_rescreen) ||
    isFail(student.scoliosis_initial) || 
    isFail(student.scoliosis_rescreen)
  );
}

/**
 * Check if any screening data has been entered
 */
function hasScreeningData(student) {
  if (student.vision_initial_right || student.vision_initial_left || 
      student.vision_rescreen_right || student.vision_rescreen_left) {
    return true;
  }
  
  const hearingFields = [
    'hearing_initial_right_1000', 'hearing_initial_right_2000', 'hearing_initial_right_4000',
    'hearing_initial_left_1000', 'hearing_initial_left_2000', 'hearing_initial_left_4000',
    'hearing_rescreen_right_1000', 'hearing_rescreen_right_2000', 'hearing_rescreen_right_4000',
    'hearing_rescreen_left_1000', 'hearing_rescreen_left_2000', 'hearing_rescreen_left_4000'
  ];
  if (hearingFields.some(field => student[field])) {
    return true;
  }
  
  if (student.acanthosis_initial || student.acanthosis_rescreen) {
    return true;
  }
  
  if (student.scoliosis_initial || student.scoliosis_rescreen) {
    return true;
  }
  
  return false;
}

/**
 * Determine the computed status of a student's screening (without override)
 */
export function getComputedStatus(student) {
  // Not started if no screening record
  if (!student.initial_screening_date) {
    return 'not_started';
  }

  // Absent only if marked absent AND no screening data entered
  if (student.was_absent && !hasScreeningData(student)) {
    return 'absent';
  }

  // Check if all required tests are complete
  const visionComplete = !student.vision_required || (student.vision_complete === true);
  const hearingComplete = !student.hearing_required || (student.hearing_complete === true);
  const acanthosisComplete = !student.acanthosis_required || (student.acanthosis_complete === true);
  const scoliosisComplete = !student.scoliosis_required || (student.scoliosis_complete === true);

  const allComplete = visionComplete && hearingComplete && acanthosisComplete && scoliosisComplete;

  return allComplete ? 'completed' : 'incomplete';
}

/**
 * Get the status of a student's screening row (with override support)
 */
export function getRowStatus(student) {
  const validStatuses = ['not_started', 'completed', 'incomplete', 'absent'];
  
  if (student.status_override && validStatuses.includes(student.status_override)) {
    return student.status_override;
  }

  return getComputedStatus(student);
}

/**
 * Get the background color class for a row based on status
 */
export function getRowColor(status) {
  const colors = {
    'not_started': 'bg-white',
    'completed': 'bg-green-50',
    'incomplete': 'bg-amber-50',
    'absent': 'bg-blue-100',
  };
  return colors[status] || 'bg-white';
}

/**
 * Format test result for display (PASS/FAIL)
 */
export function formatTestResult(result) {
  if (result === null || result === undefined || result === '') {
    return '';
  }
  const normalized = result.toString().toUpperCase().trim();
  if (normalized === 'P' || normalized === 'PASS') {
    return 'PASS';
  }
  if (normalized === 'F' || normalized === 'FAIL') {
    return 'FAIL';
  }
  return result.toString();
}

/**
 * Format date for display (MM/DD/YYYY)
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

/**
 * Format DOB for display
 */
export function formatDOB(dobString) {
  return formatDate(dobString);
}

/**
 * Get overall vision pass/fail (screener's explicit determination)
 */
export function getVisionOverall(student) {
  if (student.vision_overall) {
    return student.vision_overall.toUpperCase();
  }
  return '';
}

/**
 * Get overall hearing pass/fail (screener's explicit determination)
 */
export function getHearingOverall(student) {
  if (student.hearing_overall) {
    return student.hearing_overall.toUpperCase();
  }
  return '';
}

/**
 * Check if a student status is "returning" (handles both lowercase and capitalized)
 */
export function isReturningStudent(student) {
  const status = student.status?.toLowerCase();
  return status === 'returning';
}

/**
 * Normalize student status to lowercase for consistent comparison
 */
export function normalizeStatus(status) {
  if (!status) return 'new';
  return status.toLowerCase();
}
