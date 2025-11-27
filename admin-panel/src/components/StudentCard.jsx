import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getScreeners } from '../api/client';
import { hasFailedTest, needsRescreen, getFailedTests, getRowStatus, formatTestResult, isTestFail, formatDOB, getRescreenStatus, getStateRequiredTests, getRemainingTests } from '../utils/statusHelpers';
import { TEST_RESULT_OPTIONS, VISION_ACUITY_OPTIONS, GRADE_OPTIONS } from '../constants/screeningOptions';

/**
 * Format vision value as "20/XX" - handles raw numbers and existing "20/XX" format
 */
function formatVision(value) {
  if (!value) return '';
  const v = String(value).trim();
  
  // If it's P or F, return as-is
  if (v.toUpperCase() === 'P' || v.toUpperCase() === 'F') return v;
  
  // If it's already in 20/XX format, return as-is
  if (v.startsWith('20/')) return v;
  
  // If it's a number (like "20", "30", "40"), format as 20/XX
  const num = parseInt(v);
  if (!isNaN(num)) return `20/${num}`;
  
  return v;
}

// Note: getStateRequiredTests and getRemainingTests are imported from statusHelpers.js

/**
 * Status badge component
 */
function StatusBadge({ status, hasFailed, rescreenStatus, allInitialsDone }) {
  // Determine rescreen states
  const hasPendingRescreens = rescreenStatus?.pending?.length > 0;
  const hadFailedTests = rescreenStatus?.needed?.length > 0;
  const allRescreensDone = hadFailedTests && rescreenStatus?.pending?.length === 0;
  const allRescreensPassed = allRescreensDone && rescreenStatus?.rescreenFailed?.length === 0;
  
  // Badge logic:
  // 1. Primary: Incomplete / Needs Rescreen / Complete / Not Started / Absent
  // 2. Secondary: "FAILED" if any test failed (and not all rescreens passed)
  // 3. Tertiary: "Rescreened" if all rescreens done
  
  let primaryBadge = null;
  
  if (status === 'not_started') {
    primaryBadge = { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Not Started' };
  } else if (status === 'absent') {
    primaryBadge = { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Absent' };
  } else if (status === 'incomplete') {
    primaryBadge = { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Incomplete' };
  } else if (status === 'needs_rescreen') {
    primaryBadge = { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', label: 'Needs Rescreen' };
  } else if (status === 'completed') {
    primaryBadge = { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Complete' };
  }
  
  if (!primaryBadge) {
    primaryBadge = { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Unknown' };
  }
  
  // Show FAILED if any test failed and rescreens haven't all passed
  const showFailed = hasFailed && !allRescreensPassed;
  
  // Show Rescreened if all rescreens are done
  const showRescreened = allRescreensDone;
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${primaryBadge.bg} ${primaryBadge.text} border ${primaryBadge.border}`}>
        {primaryBadge.label}
      </span>
      
      {showFailed && (
        <span className="px-2.5 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 border border-red-300">
          FAILED
        </span>
      )}
      
      {showRescreened && (
        <span className="px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-300">
          Rescreened
        </span>
      )}
    </div>
  );
}

/**
 * Display value helper
 */
function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

/**
 * Required indicator component
 */
function RequiredBadge({ isStateRequired, isEnabled, onToggle, isEditing }) {
  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-gray-600">Required</span>
        </label>
      ) : (
        isEnabled && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            ✓ Required
          </span>
        )
      )}
      {isStateRequired && (
        <span className="text-xs text-gray-400" title="State mandated for this grade">
          (State req.)
        </span>
      )}
    </div>
  );
}

/**
 * Simple select component
 */
function SelectField({ value, onChange, options, disabled, isFailed, formatValue }) {
  const baseClass = "w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const failedClass = isFailed ? "border-red-300 bg-red-50 text-red-700 font-semibold" : "border-gray-300";
  const disabledClass = disabled ? "bg-gray-50 text-gray-700" : "";
  
  if (disabled) {
    // Try to find matching option label, or format the raw value
    let displayVal = options.find(o => o.value === value)?.label;
    if (!displayVal && value) {
      displayVal = formatValue ? formatValue(value) : displayValue(value);
    }
    if (!displayVal) displayVal = displayValue(value);
    
    return (
      <div className={`px-2 py-1.5 text-sm rounded-md ${isFailed ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-700'}`}>
        {displayVal}
      </div>
    );
  }
  
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseClass} ${failedClass} ${disabledClass}`}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

/**
 * Editable field component
 */
function EditField({ label, value, onChange, type = 'text', options = [], disabled = false, isFailed = false }) {
  const failedStyles = isFailed ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : '';
  
  if (disabled) {
    if (type === 'checkbox') {
      return (
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={!!value} disabled className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      );
    }
    
    let displayVal = displayValue(value);
    if (type === 'select' && options.length > 0 && value) {
      const option = options.find(o => o.value === value);
      if (option) displayVal = option.label;
    }
    
    return (
      <div className={`flex flex-col gap-1 ${isFailed ? 'p-2 rounded-lg ' + failedStyles : ''}`}>
        {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
        <span className={`text-sm ${value ? (isFailed ? 'text-red-700 font-semibold' : 'text-gray-900') : 'text-gray-400'}`}>
          {displayVal}
        </span>
      </div>
    );
  }
  
  if (type === 'select') {
    return (
      <div className={`flex flex-col gap-1 ${isFailed ? 'p-2 rounded-lg ' + failedStyles : ''}`}>
        {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }
  
  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
    );
  }
  
  return (
    <div className={`flex flex-col gap-1 ${isFailed ? 'p-2 rounded-lg ' + failedStyles : ''}`}>
      {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// Note: getRemainingTests is imported from statusHelpers.js

/**
 * Compact student card for grid view
 */
export function StudentCardCompact({ student, onClick, isSelected }) {
  const status = getRowStatus(student);
  const hasFailed = hasFailedTest(student);
  const hasRescreenNeeded = needsRescreen(student);
  const failedTests = hasFailed ? getFailedTests(student) : [];
  const remainingTests = getRemainingTests(student);
  const rescreenStatus = getRescreenStatus(student);
  
  // Determine if rescreens are pending (failed but not rescreened yet)
  const hasPendingRescreens = rescreenStatus.pending.length > 0;
  // All rescreens done (no pending)
  const allRescreensDone = rescreenStatus.needed.length > 0 && rescreenStatus.pending.length === 0;
  // All rescreens passed
  const allRescreensPassed = allRescreensDone && rescreenStatus.rescreenFailed.length === 0;
  
  // Check if all initial screenings are complete (no remaining tests)
  const allInitialScreeningsDone = remainingTests.length === 0 && status !== 'not_started';
  
  // PURPLE = All initial screenings done + some failed + rescreens still pending
  // Only show purple when COMPLETE with initial screenings but needs rescreens
  const isRescreenPending = allInitialScreeningsDone && hasFailed && hasPendingRescreens;
  
  const borderColors = {
    not_started: 'border-gray-200 hover:border-gray-400',
    completed: 'border-green-200 hover:border-green-400',
    incomplete: 'border-amber-200 hover:border-amber-400',
    absent: 'border-blue-200 hover:border-blue-400',
    rescreen_needed: 'border-purple-300 hover:border-purple-400',
  };
  
  const bgColors = {
    not_started: 'bg-white',
    completed: 'bg-green-50/50',
    incomplete: 'bg-amber-50/50',
    absent: 'bg-blue-50/50',
    rescreen_needed: 'bg-purple-50',
  };
  
  // Determine visual status for card styling
  const visualStatus = isRescreenPending ? 'rescreen_needed' : status;
  
  // Show red left border only if failed AND rescreens not all passed
  const showFailedBorder = hasFailed && !allRescreensPassed;
  
  const testLabels = { V: 'Vision', H: 'Hearing', A: 'AN', S: 'Scoliosis' };
  
  return (
    <div
      onClick={onClick}
      className={`
        ${bgColors[visualStatus]} ${borderColors[visualStatus]}
        border-2 rounded-lg p-3 cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
        ${showFailedBorder ? 'border-l-4 border-l-red-500' : ''}
      `}
    >
      {/* Row 1: Name only - full width */}
      <h3 className="font-semibold text-gray-900 truncate text-base mb-1">
        {student.last_name}, {student.first_name}
      </h3>
      
      {/* Row 2: Grade, Teacher, ID */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <span className="font-medium">{student.grade}</span>
        <span>•</span>
        <span className="truncate">{student.teacher || 'No Teacher'}</span>
        <span>•</span>
        <span>ID: {student.unique_id || student.student_id || '—'}</span>
        {student.glasses_or_contacts === 'Yes' && (
          <span className="px-1 bg-gray-100 rounded">👓</span>
        )}
      </div>
      
      {/* Row 3: Status badges - own line */}
      <div className="mb-2">
        <StatusBadge status={status} hasFailed={hasFailed} rescreenStatus={rescreenStatus} allInitialsDone={allInitialScreeningsDone} />
      </div>
      
      {remainingTests.length > 0 && status !== 'completed' && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          <span className="text-xs text-gray-500">Needs:</span>
          {remainingTests.map(test => (
            <span key={test} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
              {testLabels[test]}
            </span>
          ))}
        </div>
      )}
      
      {/* Only show Failed section if not all rescreens passed */}
      {hasFailed && failedTests.length > 0 && !allRescreensPassed && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          <span className="text-xs text-red-600 font-medium">Failed:</span>
          {failedTests.map(test => (
            <span key={test} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
              {test}
            </span>
          ))}
        </div>
      )}
      
      {/* Rescreen Status - only show when there's rescreen activity */}
      {rescreenStatus.completed.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-blue-600 font-medium">Rescreened:</span>
            {rescreenStatus.rescreenPassed.map(test => (
              <span key={test} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                {test} ✓
              </span>
            ))}
            {rescreenStatus.rescreenFailed.map(test => (
              <span key={test} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                {test} ✗
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Expanded student card with full details
 */
export function StudentCardExpanded({ 
  student, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onChange,
  onClose,
  isSaving 
}) {
  // Fetch screeners for dropdown
  const { data: screenersData } = useQuery({
    queryKey: ['screeners'],
    queryFn: getScreeners,
  });
  const screeners = screenersData?.screeners || [];
  const screenerOptions = [
    { value: '', label: '— Select Screener —' },
    ...screeners.map(s => ({ value: s.name, label: s.name }))
  ];
  
  const status = getRowStatus(student);
  const hasFailed = hasFailedTest(student);
  const stateRequired = getStateRequiredTests(student);
  const rescreenStatus = getRescreenStatus(student);
  const remainingTests = getRemainingTests(student);
  
  // Check if all initial screenings are done
  const allInitialsDone = remainingTests.length === 0 && status !== 'not_started';
  
  // Check which test categories failed
  const visionFailed = isTestFail(student.vision_overall) || isTestFail(student.vision_initial_right) || isTestFail(student.vision_initial_left);
  const hearingFailed = isTestFail(student.hearing_overall) || 
    isTestFail(student.hearing_initial_right_1000) || isTestFail(student.hearing_initial_left_1000);
  const anFailed = isTestFail(student.acanthosis_initial) || isTestFail(student.acanthosis_rescreen);
  const scoliosisFailed = isTestFail(student.scoliosis_initial) || isTestFail(student.scoliosis_rescreen);
  
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${hasFailed ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {student.last_name || '—'}, {student.first_name || '—'}
            </h2>
            <p className="text-sm text-gray-500">
              {student.grade || 'No Grade'} • {student.school || 'No School'} • {student.teacher || 'No Teacher'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} hasFailed={hasFailed} rescreenStatus={rescreenStatus} allInitialsDone={allInitialsDone} />
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Student Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <EditField label="First Name" value={student.first_name} onChange={(v) => onChange('first_name', v)} disabled={!isEditing} />
          <EditField label="Last Name" value={student.last_name} onChange={(v) => onChange('last_name', v)} disabled={!isEditing} />
          <EditField label="Grade" value={student.grade} onChange={(v) => onChange('grade', v)} type="select" options={GRADE_OPTIONS} disabled={!isEditing} />
          <EditField label="Gender" value={student.gender} onChange={(v) => onChange('gender', v)} type="select" options={[{ value: '', label: '—' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} disabled={!isEditing} />
          <EditField label="DOB" value={student.dob ? new Date(student.dob).toISOString().split('T')[0] : ''} onChange={(v) => onChange('dob', v)} type="date" disabled={!isEditing} />
          <EditField label="Student ID" value={student.unique_id} onChange={(v) => onChange('unique_id', v)} disabled={!isEditing} />
          <EditField label="Teacher" value={student.teacher} onChange={(v) => onChange('teacher', v)} disabled={!isEditing} />
          <div className="flex items-end">
            <EditField label="Glasses/Contacts" value={student.glasses_or_contacts === 'Yes'} onChange={(v) => onChange('glasses_or_contacts', v ? 'Yes' : 'No')} type="checkbox" disabled={!isEditing} />
          </div>
        </div>
        
        {/* Test Results - 2 column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          
          {/* Vision Section */}
          <div className={`rounded-xl border-2 p-4 ${visionFailed ? 'border-red-300 bg-red-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👁️</span>
                <h4 className="font-semibold text-gray-800">Vision</h4>
                {visionFailed && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">FAILED</span>}
              </div>
              <RequiredBadge 
                isStateRequired={stateRequired.vision} 
                isEnabled={student.vision_required ?? stateRequired.vision}
                onToggle={(v) => onChange('vision_required', v)}
                isEditing={isEditing}
              />
            </div>
            
            {/* Overall Result */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">Overall Result</label>
              <SelectField value={student.vision_overall} onChange={(v) => onChange('vision_overall', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.vision_overall)} />
            </div>
            
            {/* Vision Grid - Table style */}
            <div className="bg-white/60 rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-600"></th>
                    <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">Right Eye</th>
                    <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">Left Eye</th>
                    <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">Screener</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-2 py-2 text-xs font-medium text-gray-600">Initial</td>
                    <td className="px-2 py-1">
                      <SelectField value={student.vision_initial_right} onChange={(v) => onChange('vision_initial_right', v)} options={VISION_ACUITY_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.vision_initial_right)} formatValue={formatVision} />
                    </td>
                    <td className="px-2 py-1">
                      <SelectField value={student.vision_initial_left} onChange={(v) => onChange('vision_initial_left', v)} options={VISION_ACUITY_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.vision_initial_left)} formatValue={formatVision} />
                    </td>
                    <td className="px-2 py-1">
                      {isEditing ? (
                        <select value={student.vision_initial_screener || ''} onChange={(e) => onChange('vision_initial_screener', e.target.value)} className="w-full px-1 py-1 text-xs border border-gray-300 rounded">
                          {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">{student.vision_initial_screener || '—'}</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-gray-50/50">
                    <td className="px-2 py-2 text-xs font-medium text-gray-600">Rescreen</td>
                    <td className="px-2 py-1">
                      <SelectField value={student.vision_rescreen_right} onChange={(v) => onChange('vision_rescreen_right', v)} options={VISION_ACUITY_OPTIONS} disabled={!isEditing} formatValue={formatVision} />
                    </td>
                    <td className="px-2 py-1">
                      <SelectField value={student.vision_rescreen_left} onChange={(v) => onChange('vision_rescreen_left', v)} options={VISION_ACUITY_OPTIONS} disabled={!isEditing} formatValue={formatVision} />
                    </td>
                    <td className="px-2 py-1">
                      {isEditing ? (
                        <select value={student.vision_rescreen_screener || ''} onChange={(e) => onChange('vision_rescreen_screener', e.target.value)} className="w-full px-1 py-1 text-xs border border-gray-300 rounded">
                          {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">{student.vision_rescreen_screener || '—'}</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Hearing Section */}
          <div className={`rounded-xl border-2 p-4 ${hearingFailed ? 'border-red-300 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👂</span>
                <h4 className="font-semibold text-gray-800">Hearing</h4>
                {hearingFailed && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">FAILED</span>}
              </div>
              <RequiredBadge 
                isStateRequired={stateRequired.hearing} 
                isEnabled={student.hearing_required ?? stateRequired.hearing}
                onToggle={(v) => onChange('hearing_required', v)}
                isEditing={isEditing}
              />
            </div>
            
            {/* Overall Result */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">Overall Result</label>
              <SelectField value={student.hearing_overall} onChange={(v) => onChange('hearing_overall', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_overall)} />
            </div>
            
            {/* Hearing Grid - Table style */}
            <div className="bg-white/60 rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-600">25dB</th>
                    <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">1000Hz</th>
                    <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">2000Hz</th>
                    <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">4000Hz</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-2 py-2 text-xs font-medium text-gray-600">Right</td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_initial_right_1000} onChange={(v) => onChange('hearing_initial_right_1000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_right_1000)} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_initial_right_2000} onChange={(v) => onChange('hearing_initial_right_2000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_right_2000)} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_initial_right_4000} onChange={(v) => onChange('hearing_initial_right_4000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_right_4000)} /></td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-2 py-2 text-xs font-medium text-gray-600">Left</td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_initial_left_1000} onChange={(v) => onChange('hearing_initial_left_1000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_left_1000)} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_initial_left_2000} onChange={(v) => onChange('hearing_initial_left_2000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_left_2000)} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_initial_left_4000} onChange={(v) => onChange('hearing_initial_left_4000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_left_4000)} /></td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-2 py-1 text-xs font-medium text-purple-600">Screener</td>
                    <td className="px-1 py-1" colSpan={3}>
                      {isEditing ? (
                        <select value={student.hearing_initial_screener || ''} onChange={(e) => onChange('hearing_initial_screener', e.target.value)} className="w-full px-1 py-1 text-xs border border-gray-300 rounded">
                          {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">{student.hearing_initial_screener || '—'}</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-gray-50/50">
                    <td className="px-2 py-2 text-xs font-medium text-gray-500" colSpan={4}>Rescreen</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-2 py-2 text-xs font-medium text-gray-600">Right</td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_rescreen_right_1000} onChange={(v) => onChange('hearing_rescreen_right_1000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_rescreen_right_2000} onChange={(v) => onChange('hearing_rescreen_right_2000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_rescreen_right_4000} onChange={(v) => onChange('hearing_rescreen_right_4000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} /></td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-2 py-2 text-xs font-medium text-gray-600">Left</td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_rescreen_left_1000} onChange={(v) => onChange('hearing_rescreen_left_1000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_rescreen_left_2000} onChange={(v) => onChange('hearing_rescreen_left_2000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} /></td>
                    <td className="px-1 py-1"><SelectField value={student.hearing_rescreen_left_4000} onChange={(v) => onChange('hearing_rescreen_left_4000', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} /></td>
                  </tr>
                  <tr className="bg-gray-50/50 border-t border-gray-200">
                    <td className="px-2 py-1 text-xs font-medium text-purple-600">Screener</td>
                    <td className="px-1 py-1" colSpan={3}>
                      {isEditing ? (
                        <select value={student.hearing_rescreen_screener || ''} onChange={(e) => onChange('hearing_rescreen_screener', e.target.value)} className="w-full px-1 py-1 text-xs border border-gray-300 rounded">
                          {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">{student.hearing_rescreen_screener || '—'}</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Acanthosis Section */}
          <div className={`rounded-xl border-2 p-4 ${anFailed ? 'border-red-300 bg-red-50/30' : 'border-purple-200 bg-purple-50/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🩺</span>
                <h4 className="font-semibold text-gray-800">Acanthosis Nigricans</h4>
                {anFailed && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">FAILED</span>}
              </div>
              <RequiredBadge 
                isStateRequired={stateRequired.acanthosis} 
                isEnabled={student.acanthosis_required ?? stateRequired.acanthosis}
                onToggle={(v) => onChange('acanthosis_required', v)}
                isEditing={isEditing}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Initial</label>
                <SelectField value={student.acanthosis_initial} onChange={(v) => onChange('acanthosis_initial', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.acanthosis_initial)} />
                <label className="text-xs font-medium text-purple-600 block mt-2 mb-1">Screener</label>
                {isEditing ? (
                  <select value={student.acanthosis_initial_screener || ''} onChange={(e) => onChange('acanthosis_initial_screener', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                    {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-600">{student.acanthosis_initial_screener || '—'}</span>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Rescreen</label>
                <SelectField value={student.acanthosis_rescreen} onChange={(v) => onChange('acanthosis_rescreen', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.acanthosis_rescreen)} />
                <label className="text-xs font-medium text-purple-600 block mt-2 mb-1">Screener</label>
                {isEditing ? (
                  <select value={student.acanthosis_rescreen_screener || ''} onChange={(e) => onChange('acanthosis_rescreen_screener', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                    {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-600">{student.acanthosis_rescreen_screener || '—'}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Scoliosis Section */}
          <div className={`rounded-xl border-2 p-4 ${scoliosisFailed ? 'border-red-300 bg-red-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🦴</span>
                <h4 className="font-semibold text-gray-800">Scoliosis</h4>
                {scoliosisFailed && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">FAILED</span>}
              </div>
              <RequiredBadge 
                isStateRequired={stateRequired.scoliosis} 
                isEnabled={student.scoliosis_required ?? stateRequired.scoliosis}
                onToggle={(v) => onChange('scoliosis_required', v)}
                isEditing={isEditing}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Initial</label>
                <SelectField value={student.scoliosis_initial} onChange={(v) => onChange('scoliosis_initial', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.scoliosis_initial)} />
                <label className="text-xs font-medium text-purple-600 block mt-2 mb-1">Screener</label>
                {isEditing ? (
                  <select value={student.scoliosis_initial_screener || ''} onChange={(e) => onChange('scoliosis_initial_screener', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                    {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-600">{student.scoliosis_initial_screener || '—'}</span>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Rescreen</label>
                <SelectField value={student.scoliosis_rescreen} onChange={(v) => onChange('scoliosis_rescreen', v)} options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.scoliosis_rescreen)} />
                <label className="text-xs font-medium text-purple-600 block mt-2 mb-1">Screener</label>
                {isEditing ? (
                  <select value={student.scoliosis_rescreen_screener || ''} onChange={(e) => onChange('scoliosis_rescreen_screener', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                    {screenerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-600">{student.scoliosis_rescreen_screener || '—'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Notes - Initial and Rescreen */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">📝 Initial Screening Notes</label>
            <textarea
              value={student.initial_notes || ''}
              onChange={(e) => onChange('initial_notes', e.target.value)}
              disabled={!isEditing}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder={isEditing ? "Add initial screening notes..." : "No notes"}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">🔄 Rescreen Notes</label>
            <textarea
              value={student.rescreen_notes || ''}
              onChange={(e) => onChange('rescreen_notes', e.target.value)}
              disabled={!isEditing}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder={isEditing ? "Add rescreen notes..." : "No notes"}
            />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <EditField label="Mark Absent" value={student.was_absent} onChange={(v) => onChange('was_absent', v)} type="checkbox" disabled={!isEditing} />
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={onSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={onEdit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentCardCompact;
