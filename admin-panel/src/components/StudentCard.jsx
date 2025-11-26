import { useState } from 'react';
import { hasFailedTest, needsRescreen, getFailedTests, getRowStatus, formatTestResult, isTestFail, formatDOB } from '../utils/statusHelpers';
import { TEST_RESULT_OPTIONS, VISION_ACUITY_OPTIONS, GRADE_OPTIONS } from '../constants/screeningOptions';

/**
 * Status badge component
 */
function StatusBadge({ status, hasFailed, hasRescreen }) {
  const statusConfig = {
    not_started: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Not Started' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Complete' },
    incomplete: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Incomplete' },
    absent: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Absent' },
  };
  
  const config = statusConfig[status] || statusConfig.not_started;
  
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
        {config.label}
      </span>
      {hasFailed && (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
          FAILED
        </span>
      )}
      {hasRescreen && !hasFailed && (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
          Rescreen
        </span>
      )}
    </div>
  );
}

/**
 * Display value helper - shows a dash if empty
 */
function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

/**
 * Editable field component with proper value display
 */
function EditField({ label, value, onChange, type = 'text', options = [], disabled = false, isFailed = false }) {
  const failedStyles = isFailed ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : '';
  const failedTextStyles = isFailed ? 'text-red-700 font-semibold' : '';
  
  // For disabled view, show value nicely
  if (disabled) {
    if (type === 'checkbox') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            disabled
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      );
    }
    
    // Format display value for selects
    let displayVal = displayValue(value);
    if (type === 'select' && options.length > 0 && value) {
      const option = options.find(o => o.value === value);
      if (option) displayVal = option.label;
    }
    
    return (
      <div className={`flex flex-col gap-1 ${isFailed ? 'p-2 rounded-lg ' + failedStyles : ''}`}>
        {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
        <span className={`text-sm ${value ? (isFailed ? failedTextStyles : 'text-gray-900') : 'text-gray-400'}`}>
          {displayVal}
        </span>
      </div>
    );
  }
  
  // Editing mode
  if (type === 'select') {
    return (
      <div className={`flex flex-col gap-1 ${isFailed ? 'p-2 rounded-lg ' + failedStyles : ''}`}>
        {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isFailed ? failedTextStyles : ''}`}
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
        className={`px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isFailed ? failedTextStyles : ''}`}
      />
    </div>
  );
}

/**
 * Test section with visual indicator for failures
 */
function TestSection({ title, children, accentColor = 'blue', hasFailed = false }) {
  const colors = {
    blue: hasFailed ? 'border-red-300 bg-red-50/50' : 'border-blue-200 bg-blue-50/30',
    green: hasFailed ? 'border-red-300 bg-red-50/50' : 'border-green-200 bg-green-50/30',
    purple: hasFailed ? 'border-red-300 bg-red-50/50' : 'border-purple-200 bg-purple-50/30',
    orange: hasFailed ? 'border-red-300 bg-red-50/50' : 'border-orange-200 bg-orange-50/30',
  };
  
  return (
    <div className={`rounded-lg border-2 ${colors[accentColor]} p-3 ${hasFailed ? 'ring-2 ring-red-300' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        {hasFailed && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">FAILED</span>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

/**
 * Compact student card for the grid view
 */
export function StudentCardCompact({ student, onClick, isSelected }) {
  const status = getRowStatus(student);
  const hasFailed = hasFailedTest(student);
  const hasRescreenNeeded = needsRescreen(student);
  const failedTests = hasFailed ? getFailedTests(student) : [];
  
  const borderColors = {
    not_started: 'border-gray-200 hover:border-gray-400',
    completed: 'border-green-200 hover:border-green-400',
    incomplete: 'border-amber-200 hover:border-amber-400',
    absent: 'border-blue-200 hover:border-blue-400',
  };
  
  const bgColors = {
    not_started: 'bg-white',
    completed: 'bg-green-50/50',
    incomplete: 'bg-amber-50/50',
    absent: 'bg-blue-50/50',
  };
  
  return (
    <div
      onClick={onClick}
      className={`
        ${bgColors[status]} ${borderColors[status]}
        border-2 rounded-lg p-3 cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
        ${hasFailed ? 'border-l-4 border-l-red-500' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {student.last_name}, {student.first_name}
          </h3>
          <p className="text-xs text-gray-500">
            {student.grade} • {student.teacher || 'No Teacher'}
          </p>
        </div>
        <StatusBadge status={status} hasFailed={hasFailed} hasRescreen={hasRescreenNeeded && !hasFailed} />
      </div>
      
      {/* Quick Info */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>ID: {student.unique_id || student.student_id || '—'}</span>
        {student.glasses_or_contacts === 'Yes' && (
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">👓 Glasses</span>
        )}
      </div>
      
      {/* Failed Tests Indicator */}
      {hasFailed && failedTests.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          <span className="text-xs text-red-600 font-medium">Failed:</span>
          {failedTests.map(test => (
            <span key={test} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
              {test}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Expanded student card with full details and editing
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
  const status = getRowStatus(student);
  const hasFailed = hasFailedTest(student);
  
  // Check which test categories failed
  const visionFailed = isTestFail(student.vision_overall) || isTestFail(student.vision_initial_right) || isTestFail(student.vision_initial_left);
  const hearingFailed = isTestFail(student.hearing_overall) || 
    isTestFail(student.hearing_initial_right_1000) || isTestFail(student.hearing_initial_right_2000) || isTestFail(student.hearing_initial_right_4000) ||
    isTestFail(student.hearing_initial_left_1000) || isTestFail(student.hearing_initial_left_2000) || isTestFail(student.hearing_initial_left_4000);
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
            <StatusBadge status={status} hasFailed={hasFailed} hasRescreen={needsRescreen(student)} />
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Student Info Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <EditField
            label="First Name"
            value={student.first_name}
            onChange={(v) => onChange('first_name', v)}
            disabled={!isEditing}
          />
          <EditField
            label="Last Name"
            value={student.last_name}
            onChange={(v) => onChange('last_name', v)}
            disabled={!isEditing}
          />
          <EditField
            label="Grade"
            value={student.grade}
            onChange={(v) => onChange('grade', v)}
            type="select"
            options={GRADE_OPTIONS}
            disabled={!isEditing}
          />
          <EditField
            label="Gender"
            value={student.gender}
            onChange={(v) => onChange('gender', v)}
            type="select"
            options={[{ value: '', label: '—' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
            disabled={!isEditing}
          />
          <EditField
            label="DOB"
            value={student.dob ? new Date(student.dob).toISOString().split('T')[0] : ''}
            onChange={(v) => onChange('dob', v)}
            type="date"
            disabled={!isEditing}
          />
          <EditField
            label="Student ID"
            value={student.unique_id}
            onChange={(v) => onChange('unique_id', v)}
            disabled={!isEditing}
          />
          <EditField
            label="Teacher"
            value={student.teacher}
            onChange={(v) => onChange('teacher', v)}
            disabled={!isEditing}
          />
          <div className="flex items-end">
            <EditField
              label="Glasses/Contacts"
              value={student.glasses_or_contacts === 'Yes' || student.glasses_or_contacts === true}
              onChange={(v) => onChange('glasses_or_contacts', v ? 'Yes' : 'No')}
              type="checkbox"
              disabled={!isEditing}
            />
          </div>
        </div>
        
        {/* Test Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Vision */}
          <TestSection title="👁️ Vision" accentColor="blue" hasFailed={visionFailed}>
            <div className="grid grid-cols-2 gap-2">
              <EditField
                label="Overall"
                value={student.vision_overall}
                onChange={(v) => onChange('vision_overall', v)}
                type="select"
                options={TEST_RESULT_OPTIONS}
                disabled={!isEditing}
                isFailed={isTestFail(student.vision_overall)}
              />
              <div></div>
              <EditField
                label="Initial Right"
                value={student.vision_initial_right}
                onChange={(v) => onChange('vision_initial_right', v)}
                type="select"
                options={VISION_ACUITY_OPTIONS}
                disabled={!isEditing}
                isFailed={isTestFail(student.vision_initial_right)}
              />
              <EditField
                label="Initial Left"
                value={student.vision_initial_left}
                onChange={(v) => onChange('vision_initial_left', v)}
                type="select"
                options={VISION_ACUITY_OPTIONS}
                disabled={!isEditing}
                isFailed={isTestFail(student.vision_initial_left)}
              />
              <EditField
                label="Rescreen Right"
                value={student.vision_rescreen_right}
                onChange={(v) => onChange('vision_rescreen_right', v)}
                type="select"
                options={VISION_ACUITY_OPTIONS}
                disabled={!isEditing}
              />
              <EditField
                label="Rescreen Left"
                value={student.vision_rescreen_left}
                onChange={(v) => onChange('vision_rescreen_left', v)}
                type="select"
                options={VISION_ACUITY_OPTIONS}
                disabled={!isEditing}
              />
            </div>
          </TestSection>
          
          {/* Hearing */}
          <TestSection title="👂 Hearing" accentColor="green" hasFailed={hearingFailed}>
            <EditField
              label="Overall"
              value={student.hearing_overall}
              onChange={(v) => onChange('hearing_overall', v)}
              type="select"
              options={TEST_RESULT_OPTIONS}
              disabled={!isEditing}
              isFailed={isTestFail(student.hearing_overall)}
            />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <span className="text-xs text-gray-400 text-center">1000Hz</span>
              <span className="text-xs text-gray-400 text-center">2000Hz</span>
              <span className="text-xs text-gray-400 text-center">4000Hz</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Initial Right</p>
              <div className="grid grid-cols-3 gap-2">
                <EditField label="" value={student.hearing_initial_right_1000} onChange={(v) => onChange('hearing_initial_right_1000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_right_1000)} />
                <EditField label="" value={student.hearing_initial_right_2000} onChange={(v) => onChange('hearing_initial_right_2000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_right_2000)} />
                <EditField label="" value={student.hearing_initial_right_4000} onChange={(v) => onChange('hearing_initial_right_4000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_right_4000)} />
              </div>
              <p className="text-xs font-medium text-gray-500 mt-2">Initial Left</p>
              <div className="grid grid-cols-3 gap-2">
                <EditField label="" value={student.hearing_initial_left_1000} onChange={(v) => onChange('hearing_initial_left_1000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_left_1000)} />
                <EditField label="" value={student.hearing_initial_left_2000} onChange={(v) => onChange('hearing_initial_left_2000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_left_2000)} />
                <EditField label="" value={student.hearing_initial_left_4000} onChange={(v) => onChange('hearing_initial_left_4000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} isFailed={isTestFail(student.hearing_initial_left_4000)} />
              </div>
              <p className="text-xs font-medium text-gray-500 mt-2">Rescreen Right</p>
              <div className="grid grid-cols-3 gap-2">
                <EditField label="" value={student.hearing_rescreen_right_1000} onChange={(v) => onChange('hearing_rescreen_right_1000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} />
                <EditField label="" value={student.hearing_rescreen_right_2000} onChange={(v) => onChange('hearing_rescreen_right_2000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} />
                <EditField label="" value={student.hearing_rescreen_right_4000} onChange={(v) => onChange('hearing_rescreen_right_4000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} />
              </div>
              <p className="text-xs font-medium text-gray-500 mt-2">Rescreen Left</p>
              <div className="grid grid-cols-3 gap-2">
                <EditField label="" value={student.hearing_rescreen_left_1000} onChange={(v) => onChange('hearing_rescreen_left_1000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} />
                <EditField label="" value={student.hearing_rescreen_left_2000} onChange={(v) => onChange('hearing_rescreen_left_2000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} />
                <EditField label="" value={student.hearing_rescreen_left_4000} onChange={(v) => onChange('hearing_rescreen_left_4000', v)} type="select" options={TEST_RESULT_OPTIONS} disabled={!isEditing} />
              </div>
            </div>
          </TestSection>
          
          {/* AN (Acanthosis) */}
          <TestSection title="🩺 Acanthosis Nigricans" accentColor="purple" hasFailed={anFailed}>
            <div className="grid grid-cols-2 gap-2">
              <EditField
                label="Initial"
                value={student.acanthosis_initial}
                onChange={(v) => onChange('acanthosis_initial', v)}
                type="select"
                options={TEST_RESULT_OPTIONS}
                disabled={!isEditing}
                isFailed={isTestFail(student.acanthosis_initial)}
              />
              <EditField
                label="Rescreen"
                value={student.acanthosis_rescreen}
                onChange={(v) => onChange('acanthosis_rescreen', v)}
                type="select"
                options={TEST_RESULT_OPTIONS}
                disabled={!isEditing}
                isFailed={isTestFail(student.acanthosis_rescreen)}
              />
            </div>
          </TestSection>
          
          {/* Scoliosis */}
          <TestSection title="🦴 Scoliosis" accentColor="orange" hasFailed={scoliosisFailed}>
            <div className="grid grid-cols-2 gap-2">
              <EditField
                label="Initial"
                value={student.scoliosis_initial}
                onChange={(v) => onChange('scoliosis_initial', v)}
                type="select"
                options={TEST_RESULT_OPTIONS}
                disabled={!isEditing}
                isFailed={isTestFail(student.scoliosis_initial)}
              />
              <EditField
                label="Rescreen"
                value={student.scoliosis_rescreen}
                onChange={(v) => onChange('scoliosis_rescreen', v)}
                type="select"
                options={TEST_RESULT_OPTIONS}
                disabled={!isEditing}
                isFailed={isTestFail(student.scoliosis_rescreen)}
              />
            </div>
          </TestSection>
        </div>
        
        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">Notes</label>
          <textarea
            value={student.notes || ''}
            onChange={(e) => onChange('notes', e.target.value)}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder={isEditing ? "Add notes..." : "No notes"}
          />
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <EditField
              label="Mark Absent"
              value={student.was_absent}
              onChange={(v) => onChange('was_absent', v)}
              type="checkbox"
              disabled={!isEditing}
            />
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={onCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
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
              <button
                onClick={onEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
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
