/**
 * Shared constants for screening options used across the admin panel
 */

// Test result options for Pass/Fail dropdowns
export const TEST_RESULT_OPTIONS = [
  { value: '', label: '' },
  { value: 'P', label: 'Pass' },
  { value: 'F', label: 'Fail' },
];

// Vision acuity score options (20/20 to 20/100)
export const VISION_ACUITY_OPTIONS = [
  { value: '', label: '' },
  { value: '20/20', label: '20/20' },
  { value: '20/30', label: '20/30' },
  { value: '20/40', label: '20/40' },
  { value: '20/50', label: '20/50' },
  { value: '20/60', label: '20/60' },
  { value: '20/70', label: '20/70' },
  { value: '20/80', label: '20/80' },
  { value: '20/90', label: '20/90' },
  { value: '20/100', label: '20/100' },
];

// Grade options - must match database format exactly
export const GRADE_OPTIONS = [
  { value: '', label: '' },
  { value: 'Pre-K (3)', label: 'Pre-K (3)' },
  { value: 'Pre-K (4)', label: 'Pre-K (4)' },
  { value: 'Kindergarten', label: 'Kindergarten' },
  { value: '1st', label: '1st' },
  { value: '2nd', label: '2nd' },
  { value: '3rd', label: '3rd' },
  { value: '4th', label: '4th' },
  { value: '5th', label: '5th' },
  { value: '6th', label: '6th' },
  { value: '7th', label: '7th' },
  { value: '8th', label: '8th' },
  { value: '9th', label: '9th' },
  { value: '10th', label: '10th' },
  { value: '11th', label: '11th' },
  { value: '12th', label: '12th' },
];

// Grade options without empty option (for dropdowns that require a selection)
export const GRADE_OPTIONS_NO_EMPTY = GRADE_OPTIONS.filter(opt => opt.value !== '');

// Gender options
export const GENDER_OPTIONS = [
  { value: '', label: '' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

// Gender options for dashboard (short form)
export const GENDER_OPTIONS_SHORT = [
  { value: 'M', label: 'M' },
  { value: 'F', label: 'F' },
  { value: 'Other', label: 'Other' },
];

// Yes/No options
export const YES_NO_OPTIONS = [
  { value: '', label: '' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

// Student status options
export const STUDENT_STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Returning', label: 'Returning' },
];

// Screening status override options
export const STATUS_OVERRIDE_OPTIONS = [
  { value: '', label: 'Auto (Computed)' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'absent', label: 'Absent' },
];

// All hearing frequency fields (for iteration)
export const HEARING_FIELDS = [
  'hearing_initial_right_1000', 'hearing_initial_right_2000', 'hearing_initial_right_4000',
  'hearing_initial_left_1000', 'hearing_initial_left_2000', 'hearing_initial_left_4000',
  'hearing_rescreen_right_1000', 'hearing_rescreen_right_2000', 'hearing_rescreen_right_4000',
  'hearing_rescreen_left_1000', 'hearing_rescreen_left_2000', 'hearing_rescreen_left_4000'
];

// Default column filter state
export const DEFAULT_COLUMN_FILTERS = {
  grade: '',
  returning: '',
  first_name: '',
  last_name: '',
  student_id: '',
  gender: '',
  dob: '',
  school: '',
  teacher: '',
  glasses_contacts: '',
  screening_date: '',
  absent: '',
  notes: '',
  status_override: '',
  vision_overall: '',
  vision_initial_right: '',
  vision_initial_left: '',
  vision_rescreen_right: '',
  vision_rescreen_left: '',
  hearing_overall: '',
  hearing_initial_right_1000: '',
  hearing_initial_right_2000: '',
  hearing_initial_right_4000: '',
  hearing_initial_left_1000: '',
  hearing_initial_left_2000: '',
  hearing_initial_left_4000: '',
  hearing_rescreen_right_1000: '',
  hearing_rescreen_right_2000: '',
  hearing_rescreen_right_4000: '',
  hearing_rescreen_left_1000: '',
  hearing_rescreen_left_2000: '',
  hearing_rescreen_left_4000: '',
  acanthosis_initial: '',
  acanthosis_rescreen: '',
  scoliosis_initial: '',
  scoliosis_rescreen: '',
};

