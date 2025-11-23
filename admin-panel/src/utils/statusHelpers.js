/**
 * Check if any test has failed (returns "F")
 * @param {Object} student - Student screening data
 * @returns {boolean} - true if any test has "F"
 */
export function hasFailedTest(student) {
  return (
    student.vision_initial_right === 'F' || 
    student.vision_initial_left === 'F' ||
    student.vision_rescreen_right === 'F' || 
    student.vision_rescreen_left === 'F' ||
    // Check hearing frequencies (any frequency with "F")
    student.hearing_initial_right_1000 === 'F' ||
    student.hearing_initial_right_2000 === 'F' ||
    student.hearing_initial_right_4000 === 'F' ||
    student.hearing_initial_left_1000 === 'F' ||
    student.hearing_initial_left_2000 === 'F' ||
    student.hearing_initial_left_4000 === 'F' ||
    student.hearing_rescreen_right_1000 === 'F' ||
    student.hearing_rescreen_right_2000 === 'F' ||
    student.hearing_rescreen_right_4000 === 'F' ||
    student.hearing_rescreen_left_1000 === 'F' ||
    student.hearing_rescreen_left_2000 === 'F' ||
    student.hearing_rescreen_left_4000 === 'F' ||
    student.acanthosis_initial === 'F' || 
    student.acanthosis_rescreen === 'F' ||
    student.scoliosis_initial === 'F' || 
    student.scoliosis_rescreen === 'F'
  );
}

/**
 * Check if any screening data has been entered
 * @param {Object} student - Student screening data
 * @returns {boolean} - true if any screening data exists
 */
function hasScreeningData(student) {
  // Check vision data
  if (student.vision_initial_right || student.vision_initial_left || 
      student.vision_rescreen_right || student.vision_rescreen_left) {
    return true;
  }
  
  // Check hearing data (any frequency)
  const hearingFields = [
    'hearing_initial_right_1000', 'hearing_initial_right_2000', 'hearing_initial_right_4000',
    'hearing_initial_left_1000', 'hearing_initial_left_2000', 'hearing_initial_left_4000',
    'hearing_rescreen_right_1000', 'hearing_rescreen_right_2000', 'hearing_rescreen_right_4000',
    'hearing_rescreen_left_1000', 'hearing_rescreen_left_2000', 'hearing_rescreen_left_4000'
  ];
  if (hearingFields.some(field => student[field])) {
    return true;
  }
  
  // Check acanthosis data
  if (student.acanthosis_initial || student.acanthosis_rescreen) {
    return true;
  }
  
  // Check scoliosis data
  if (student.scoliosis_initial || student.scoliosis_rescreen) {
    return true;
  }
  
  return false;
}

/**
 * Determine the computed status of a student's screening row (without override)
 * @param {Object} student - Student screening data
 * @returns {string} - 'not_started', 'completed', 'incomplete', or 'absent'
 */
export function getComputedStatus(student) {
  // Check if not started (no screening record exists)
  if (!student.initial_screening_date) {
    return 'not_started';
  }

  // Check if absent - but only if no screening data has been entered
  // If screening data exists, they're no longer absent (they've been screened)
  if (student.was_absent && !hasScreeningData(student)) {
    return 'absent';
  }

  // Check if all required tests are complete
  // Use the database's *_complete columns which check if all fields are filled
  // A student is only complete if ALL required tests (based on grade) are complete
  const visionComplete = !student.vision_required || (student.vision_complete === true);
  const hearingComplete = !student.hearing_required || (student.hearing_complete === true);
  const acanthosisComplete = !student.acanthosis_required || (student.acanthosis_complete === true);
  const scoliosisComplete = !student.scoliosis_required || (student.scoliosis_complete === true);

  const allComplete = visionComplete && hearingComplete && acanthosisComplete && scoliosisComplete;

  // Debug logging (only in development)
  if (typeof window !== 'undefined' && import.meta.env?.DEV && Math.random() < 0.01) {
    console.log('Status calculation:', {
      unique_id: student.unique_id,
      grade: student.grade,
      was_absent: student.was_absent,
      hasScreeningData: hasScreeningData(student),
      vision_required: student.vision_required,
      vision_complete: student.vision_complete,
      hearing_required: student.hearing_required,
      hearing_complete: student.hearing_complete,
      acanthosis_required: student.acanthosis_required,
      acanthosis_complete: student.acanthosis_complete,
      scoliosis_required: student.scoliosis_required,
      scoliosis_complete: student.scoliosis_complete,
      allComplete,
      status: allComplete ? 'completed' : 'incomplete'
    });
  }

  if (allComplete) {
    return 'completed';
  }

  // Otherwise, incomplete
  return 'incomplete';
}

/**
 * Determine the status of a student's screening row (with override support)
 * @param {Object} student - Student screening data
 * @returns {string} - 'not_started', 'completed', 'incomplete', or 'absent'
 */
export function getRowStatus(student) {
  // If status_override is set, use it (but it can still be changed/cleared)
  if (student.status_override && ['not_started', 'completed', 'incomplete', 'absent'].includes(student.status_override)) {
    return student.status_override;
  }

  // Otherwise, use computed status
  return getComputedStatus(student);
}

/**
 * Get the background color class for a row based on status
 * @param {string} status - Row status
 * @returns {string} - Tailwind CSS class
 */
export function getRowColor(status) {
  switch (status) {
    case 'not_started':
      return 'bg-white'; // White for not started
    case 'completed':
      return 'bg-green-50'; // Light green for completed
    case 'incomplete':
      return 'bg-amber-50'; // Light amber for incomplete
    case 'absent':
      return 'bg-blue-100'; // Light blue for absent
    default:
      return 'bg-white';
  }
}

/**
 * Format test result for display (PASS/FAIL)
 * @param {string} result - Test result value (P/F or pass/fail)
 * @returns {string} - Formatted display value (PASS/FAIL)
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
  // For other values (like acuity scores), return as-is
  return result.toString();
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date (MM/DD/YYYY)
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

/**
 * Format DOB for display
 * @param {string} dobString - Date of birth string
 * @returns {string} - Formatted date (MM/DD/YYYY)
 */
export function formatDOB(dobString) {
  return formatDate(dobString);
}

/**
 * Get overall vision pass/fail from database (screener's explicit determination)
 * The screener's input is the source of truth, not calculated values
 * @param {Object} student - Student screening data
 * @returns {string} - 'P' (Pass), 'F' (Fail), or '' (not set by screener)
 */
export function getVisionOverall(student) {
  // Use the screener's explicit overall determination if available
  if (student.vision_overall) {
    return student.vision_overall.toUpperCase(); // Normalize to uppercase
  }
  
  // If not set by screener, return empty (don't calculate)
  return '';
}

/**
 * Get overall hearing pass/fail from database (screener's explicit determination)
 * The screener's input is the source of truth, not calculated values
 * @param {Object} student - Student screening data
 * @returns {string} - 'P' (Pass), 'F' (Fail), or '' (not set by screener)
 */
export function getHearingOverall(student) {
  // Use the screener's explicit overall determination if available
  if (student.hearing_overall) {
    return student.hearing_overall.toUpperCase(); // Normalize to uppercase
  }
  
  // If not set by screener, return empty (don't calculate)
  return '';
}

