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
 * Get list of which tests failed
 */
export function getFailedTests(student) {
  const isFail = (value) => {
    if (!value) return false;
    const normalized = value.toString().toUpperCase().trim();
    return normalized === 'F' || normalized === 'FAIL';
  };

  const failed = [];
  
  if (isFail(student.vision_overall) || isFail(student.vision_initial_right) || isFail(student.vision_initial_left)) {
    failed.push('Vision');
  }
  if (isFail(student.hearing_overall) || 
      isFail(student.hearing_initial_right_1000) || isFail(student.hearing_initial_right_2000) || isFail(student.hearing_initial_right_4000) ||
      isFail(student.hearing_initial_left_1000) || isFail(student.hearing_initial_left_2000) || isFail(student.hearing_initial_left_4000)) {
    failed.push('Hearing');
  }
  if (isFail(student.acanthosis_initial)) {
    failed.push('AN');
  }
  if (isFail(student.scoliosis_initial)) {
    failed.push('Scoliosis');
  }
  
  return failed;
}

/**
 * Get detailed rescreen status for a student
 * Returns: { needed: string[], completed: string[], pending: string[] }
 */
export function getRescreenStatus(student) {
  const isFail = (value) => {
    if (!value) return false;
    const normalized = value.toString().toUpperCase().trim();
    return normalized === 'F' || normalized === 'FAIL';
  };
  
  const isPass = (value) => {
    if (!value) return false;
    const normalized = value.toString().toUpperCase().trim();
    return normalized === 'P' || normalized === 'PASS';
  };
  
  const hasValue = (value) => value !== null && value !== undefined && value !== '';
  
  const result = {
    needed: [],      // Tests that failed initial (overall)
    completed: [],   // Tests that had rescreen done
    pending: [],     // Tests that still need rescreen (failed initial, no rescreen yet)
    rescreenPassed: [], // Tests where rescreen was done and passed
    rescreenFailed: [], // Tests where rescreen was done and failed
  };
  
  // Vision: failed if initial failed OR overall marked as fail
  const visionInitialFailed = isFail(student.vision_initial_right) || isFail(student.vision_initial_left) || isFail(student.vision_overall);
  const visionRescreenDone = hasValue(student.vision_rescreen_right) || hasValue(student.vision_rescreen_left);
  const visionRescreenPassed = !isFail(student.vision_rescreen_right) && !isFail(student.vision_rescreen_left) && visionRescreenDone;
  
  if (visionInitialFailed) {
    result.needed.push('Vision');
    if (visionRescreenDone) {
      result.completed.push('Vision');
      if (visionRescreenPassed) {
        result.rescreenPassed.push('Vision');
      } else {
        result.rescreenFailed.push('Vision');
      }
    } else {
      result.pending.push('Vision');
    }
  }
  
  // Hearing: failed if any frequency failed OR overall marked as fail
  const hearingInitialFailed = isFail(student.hearing_initial_right_1000) || isFail(student.hearing_initial_right_2000) || 
                               isFail(student.hearing_initial_right_4000) || isFail(student.hearing_initial_left_1000) ||
                               isFail(student.hearing_initial_left_2000) || isFail(student.hearing_initial_left_4000) ||
                               isFail(student.hearing_overall);
  const hearingRescreenDone = hasValue(student.hearing_rescreen_right_1000) || hasValue(student.hearing_rescreen_left_1000);
  const hearingRescreenPassed = hearingRescreenDone && 
    !isFail(student.hearing_rescreen_right_1000) && !isFail(student.hearing_rescreen_right_2000) && !isFail(student.hearing_rescreen_right_4000) &&
    !isFail(student.hearing_rescreen_left_1000) && !isFail(student.hearing_rescreen_left_2000) && !isFail(student.hearing_rescreen_left_4000);
  
  if (hearingInitialFailed) {
    result.needed.push('Hearing');
    if (hearingRescreenDone) {
      result.completed.push('Hearing');
      if (hearingRescreenPassed) {
        result.rescreenPassed.push('Hearing');
      } else {
        result.rescreenFailed.push('Hearing');
      }
    } else {
      result.pending.push('Hearing');
    }
  }
  
  // Acanthosis
  const anInitialFailed = isFail(student.acanthosis_initial);
  const anRescreenDone = hasValue(student.acanthosis_rescreen);
  const anRescreenPassed = anRescreenDone && isPass(student.acanthosis_rescreen);
  
  if (anInitialFailed) {
    result.needed.push('AN');
    if (anRescreenDone) {
      result.completed.push('AN');
      if (anRescreenPassed) {
        result.rescreenPassed.push('AN');
      } else {
        result.rescreenFailed.push('AN');
      }
    } else {
      result.pending.push('AN');
    }
  }
  
  // Scoliosis
  const scoliosisInitialFailed = isFail(student.scoliosis_initial);
  const scoliosisRescreenDone = hasValue(student.scoliosis_rescreen);
  const scoliosisRescreenPassed = scoliosisRescreenDone && isPass(student.scoliosis_rescreen);
  
  if (scoliosisInitialFailed) {
    result.needed.push('Scoliosis');
    if (scoliosisRescreenDone) {
      result.completed.push('Scoliosis');
      if (scoliosisRescreenPassed) {
        result.rescreenPassed.push('Scoliosis');
      } else {
        result.rescreenFailed.push('Scoliosis');
      }
    } else {
      result.pending.push('Scoliosis');
    }
  }
  
  return result;
}

/**
 * Check if student needs rescreen (failed initial but rescreen not done or not passed)
 */
export function needsRescreen(student) {
  const status = getRescreenStatus(student);
  // Needs rescreen if there are pending rescreens OR if rescreen was done but failed
  return status.pending.length > 0 || status.rescreenFailed.length > 0;
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
 * Check if a specific test result is a fail
 */
export function isTestFail(result) {
  if (!result) return false;
  const normalized = result.toString().toUpperCase().trim();
  return normalized === 'F' || normalized === 'FAIL';
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
