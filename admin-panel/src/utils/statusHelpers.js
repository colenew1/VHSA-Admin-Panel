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
 * Determine the computed status of a student's screening row (without override)
 * @param {Object} student - Student screening data
 * @returns {string} - 'not_started', 'completed', 'incomplete', or 'absent'
 */
export function getComputedStatus(student) {
  // Check if not started (no screening record exists)
  if (!student.initial_screening_date) {
    return 'not_started';
  }

  // Check if absent (has screening record but was absent)
  if (student.was_absent) {
    return 'absent';
  }

  // Check if all required tests are complete
  const allComplete = 
    (!student.vision_required || student.vision_complete) &&
    (!student.hearing_required || student.hearing_complete) &&
    (!student.acanthosis_required || student.acanthosis_complete) &&
    (!student.scoliosis_required || student.scoliosis_complete);

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
 * Format test result for display (P/F)
 * @param {string} result - Test result value
 * @returns {string} - Formatted display value
 */
export function formatTestResult(result) {
  if (result === null || result === undefined || result === '') {
    return '';
  }
  return result.toString().toUpperCase();
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

