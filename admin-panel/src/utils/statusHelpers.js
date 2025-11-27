/**
 * Status helper utilities for screening data
 */

/**
 * Check if student turned 4 by September 1st based on their DOB
 * Returns true if birthday is on or before September 1st (month/day only)
 */
function turned4BySept1(dob) {
  if (!dob) return true; // Default to required if no DOB
  
  const birthDate = new Date(dob);
  const month = birthDate.getMonth() + 1; // getMonth() is 0-indexed
  const day = birthDate.getDate();
  
  // If born Jan-Aug, they turned 4 before Sept 1 → Required
  if (month <= 8) return true;
  
  // If born Sept 1, they turned 4 on Sept 1 → Required
  if (month === 9 && day === 1) return true;
  
  // If born Sept 2-30 or Oct-Dec, they turned 4 after Sept 1 → Not required
  return false;
}

/**
 * Calculate which tests are state-required based on grade/status/gender/dob
 */
export function getStateRequiredTests(student) {
  const { grade, status, gender, dob } = student;
  const isNew = status === 'New';
  
  const required = {
    vision: false,
    hearing: false,
    acanthosis: false,
    scoliosis: false,
  };
  
  if (grade === 'Pre-K (3)') {
    // No required tests
  } else if (grade === 'Pre-K (4)') {
    // Only required if turned 4 by September 1st
    if (turned4BySept1(dob)) {
      required.vision = true;
      required.hearing = true;
    }
  } else if (grade === 'Kindergarten') {
    required.vision = true;
    required.hearing = true;
  } else if (grade === '1st') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
  } else if (grade === '2nd') {
    if (isNew) { required.vision = true; required.hearing = true; required.acanthosis = true; }
  } else if (grade === '3rd') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
  } else if (grade === '4th') {
    if (isNew) { required.vision = true; required.hearing = true; required.acanthosis = true; }
  } else if (grade === '5th') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
    if (gender === 'Female') required.scoliosis = true;
  } else if (grade === '6th') {
    if (isNew) { required.vision = true; required.hearing = true; required.acanthosis = true; }
  } else if (grade === '7th') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
    if (gender === 'Female') required.scoliosis = true;
  } else if (grade === '8th') {
    if (isNew) {
      required.vision = true;
      required.hearing = true;
      required.acanthosis = true;
      if (gender === 'Male') required.scoliosis = true;
    }
  } else if (['9th', '10th', '11th', '12th'].includes(grade)) {
    if (isNew) { required.vision = true; required.hearing = true; required.acanthosis = true; }
  }
  
  return required;
}

/**
 * Get effective required status - uses explicit value if set, otherwise falls back to state requirement
 */
function getEffectiveRequired(student) {
  const stateReq = getStateRequiredTests(student);
  
  return {
    vision: student.vision_required !== null && student.vision_required !== undefined 
      ? student.vision_required 
      : stateReq.vision,
    hearing: student.hearing_required !== null && student.hearing_required !== undefined 
      ? student.hearing_required 
      : stateReq.hearing,
    acanthosis: student.acanthosis_required !== null && student.acanthosis_required !== undefined 
      ? student.acanthosis_required 
      : stateReq.acanthosis,
    scoliosis: student.scoliosis_required !== null && student.scoliosis_required !== undefined 
      ? student.scoliosis_required 
      : stateReq.scoliosis,
  };
}

/**
 * Get remaining tests that still need to be done
 */
export function getRemainingTests(student) {
  const required = getEffectiveRequired(student);
  const remaining = [];
  
  const hasValue = (v) => v !== null && v !== undefined && v !== '';
  
  // Vision - done if any initial value entered
  const visionDone = hasValue(student.vision_initial_right) || hasValue(student.vision_initial_left);
  if (required.vision && !visionDone) remaining.push('V');
  
  // Hearing - done if any initial value entered
  const hearingDone = hasValue(student.hearing_initial_right_1000) || hasValue(student.hearing_initial_left_1000);
  if (required.hearing && !hearingDone) remaining.push('H');
  
  // Acanthosis
  const anDone = hasValue(student.acanthosis_initial);
  if (required.acanthosis && !anDone) remaining.push('A');
  
  // Scoliosis
  const scoliosisDone = hasValue(student.scoliosis_initial);
  if (required.scoliosis && !scoliosisDone) remaining.push('S');
  
  return remaining;
}

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
 * Check if student is currently in "failed" state
 * Returns true only if: failed initial AND (rescreen not done OR rescreen also failed)
 * Returns false if: rescreen was done and passed (they recovered)
 */
export function isCurrentlyFailed(student) {
  const rescreenStatus = getRescreenStatus(student);
  
  // If nothing ever failed, not failed
  if (rescreenStatus.needed.length === 0) {
    return false;
  }
  
  // If all rescreens are done and passed, not currently failed (they recovered)
  if (rescreenStatus.pending.length === 0 && rescreenStatus.rescreenFailed.length === 0) {
    return false;
  }
  
  // Still has pending rescreens OR rescreen failed = currently failed
  return true;
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
 * IMPORTANT: "completed" only when all screenings done AND all rescreens done (if any failed)
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

  // Get effective required status (uses state requirements as fallback)
  const required = getEffectiveRequired(student);
  
  const hasValue = (v) => v !== null && v !== undefined && v !== '';
  
  // Check if each required test is done
  const visionDone = hasValue(student.vision_initial_right) || hasValue(student.vision_initial_left);
  const hearingDone = hasValue(student.hearing_initial_right_1000) || hasValue(student.hearing_initial_left_1000);
  const anDone = hasValue(student.acanthosis_initial);
  const scoliosisDone = hasValue(student.scoliosis_initial);
  
  // A test is complete if: not required OR done
  const visionComplete = !required.vision || visionDone;
  const hearingComplete = !required.hearing || hearingDone;
  const acanthosisComplete = !required.acanthosis || anDone;
  const scoliosisComplete = !required.scoliosis || scoliosisDone;

  const allInitialComplete = visionComplete && hearingComplete && acanthosisComplete && scoliosisComplete;

  // If not all initial screenings complete, definitely incomplete
  if (!allInitialComplete) {
    return 'incomplete';
  }

  // All initial screenings done - but check if any failed and need rescreen
  const rescreenStatus = getRescreenStatus(student);
  
  // If there are ANY pending rescreens (failed initial but rescreen not done), stay incomplete
  if (rescreenStatus.pending.length > 0) {
    return 'incomplete';
  }

  // All screenings done AND all rescreens done (or no rescreens needed) = complete
  return 'completed';
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
