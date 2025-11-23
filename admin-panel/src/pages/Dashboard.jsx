import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScreeningData, updateScreening, getSchools } from '../api/client';
import { getRowStatus, getRowColor, hasFailedTest, formatDate, formatDOB, formatTestResult, getVisionOverall, getHearingOverall } from '../utils/statusHelpers';
import EditableCell from '../components/EditableCell';
import AdvancedFilters from '../components/AdvancedFilters';
import ColorLegend from '../components/ColorLegend';

// Test result options for dropdowns (Pass/Fail)
const TEST_RESULT_OPTIONS = [
  { value: '', label: '' },
  { value: 'P', label: 'Pass' },
  { value: 'F', label: 'Fail' },
];

// Vision acuity score options (20/20 to 20/100, increasing by tens)
const VISION_ACUITY_OPTIONS = [
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

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Filter state - no default dates, user must set them
  const [filters, setFilters] = useState({
    school: 'all',
    startDate: '',
    endDate: '',
    year: new Date().getFullYear().toString(), // Default to current year
    // Status checkboxes - all true by default (show all)
    statusNotStarted: true,
    statusCompleted: true,
    statusIncomplete: true,
    statusFailed: true,
    statusAbsent: true,
  });
  
  // Pagination state
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Track unsaved changes per row
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [savingRows, setSavingRows] = useState({});
  
  // Advanced filters visibility
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  
  // Per-row edit mode state (track which row is being edited by unique_id)
  const [editingRowId, setEditingRowId] = useState(null);
  
  // Track if search has been triggered
  const [hasSearched, setHasSearched] = useState(false);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (showConfirmDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [showConfirmDialog]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: 'asc' // 'asc' or 'desc'
  });

  // Column filter state (search terms for each column)
  const [columnFilters, setColumnFilters] = useState({
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
    scoliosis_rescreen: ''
  });

  // Fetch schools
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });

  const schools = schoolsData?.schools || [];

  // Initialize default date range based on current year
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    if (!filters.startDate && !filters.endDate) {
      setFilters(prev => ({
        ...prev,
        year: currentYear.toString(),
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`
      }));
    }
  }, []); // Only run on mount

  // Fetch screening data - only when search has been triggered
  // Exclude status checkboxes from queryKey to prevent refetch when clicking status bubbles
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['screening', 
      filters.school, 
      filters.startDate, 
      filters.endDate, 
      filters.year,
      filters.grade,
      filters.gender,
      filters.returning,
      filters.status, // Only the main status filter, not the checkboxes
      pageSize, 
      currentPage
    ],
    queryFn: () => getScreeningData({
      school: filters.school,
      startDate: filters.startDate,
      endDate: filters.endDate,
      year: filters.year,
      grade: filters.grade,
      gender: filters.gender,
      returning: filters.returning,
      status: filters.status,
      limit: pageSize,
      offset: currentPage * pageSize,
    }),
    enabled: hasSearched && !!(filters.startDate && filters.endDate), // Only fetch when search is clicked and dates are set
    // Note: year filter is passed in filters object and will be used by backend
    refetchOnWindowFocus: false, // Don't auto-refresh on window focus
  });

  // Update mutation - use unique_id instead of student_id
  const updateMutation = useMutation({
    mutationFn: ({ uniqueId, data }) => updateScreening(uniqueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['screening']);
    },
  });

  const allStudents = data?.data || [];
  const total = data?.total || 0;

  // Client-side filtering and sorting
  const students = useMemo(() => {
    let filtered = [...allStudents];

    // Filter by status checkboxes - only apply if search has been triggered
    // This allows users to select multiple statuses before clicking Search
    if (hasSearched) {
    filtered = filtered.filter(student => {
      const status = getRowStatus(student);
      const failed = hasFailedTest(student);
      
      // Check if student has failed tests
      if (failed && !filters.statusFailed) {
        return false;
      }
      
      switch (status) {
        case 'not_started':
          return filters.statusNotStarted;
        case 'completed':
          return filters.statusCompleted;
        case 'incomplete':
          return filters.statusIncomplete;
        case 'absent':
          return filters.statusAbsent;
        default:
          return true;
      }
    });
    }

    // Apply column filters
    filtered = filtered.filter(student => {
      // Grade filter
      if (columnFilters.grade && !student.grade?.toLowerCase().includes(columnFilters.grade.toLowerCase())) {
        return false;
      }
      // Returning filter
      if (columnFilters.returning) {
        const isReturning = student.status === 'returning';
        const filterValue = columnFilters.returning.toLowerCase();
        if (filterValue === 'yes' && !isReturning) return false;
        if (filterValue === 'no' && isReturning) return false;
        if (!['yes', 'no'].includes(filterValue) && !isReturning.toString().includes(filterValue)) return false;
      }
      // First name filter
      if (columnFilters.first_name && !student.first_name?.toLowerCase().includes(columnFilters.first_name.toLowerCase())) {
        return false;
      }
      // Last name filter
      if (columnFilters.last_name && !student.last_name?.toLowerCase().includes(columnFilters.last_name.toLowerCase())) {
        return false;
      }
      // Student ID filter
      if (columnFilters.student_id && !student.unique_id?.toLowerCase().includes(columnFilters.student_id.toLowerCase())) {
        return false;
      }
      // Gender filter
      if (columnFilters.gender && !student.gender?.toLowerCase().includes(columnFilters.gender.toLowerCase())) {
        return false;
      }
      // DOB filter
      if (columnFilters.dob) {
        const dobStr = student.dob ? formatDOB(student.dob) : '';
        if (!dobStr.includes(columnFilters.dob)) {
          return false;
        }
      }
      // School filter
      if (columnFilters.school && !student.school?.toLowerCase().includes(columnFilters.school.toLowerCase())) {
        return false;
      }
      // Teacher filter
      if (columnFilters.teacher && !student.teacher?.toLowerCase().includes(columnFilters.teacher.toLowerCase())) {
        return false;
      }
      // Glasses/Contacts filter
      if (columnFilters.glasses_contacts) {
        const glassesStr = (student.glasses_or_contacts || '').toString().toLowerCase();
        if (!glassesStr.includes(columnFilters.glasses_contacts.toLowerCase())) {
          return false;
        }
      }
      // Screening date filter
      if (columnFilters.screening_date) {
        const dateStr = student.initial_screening_date ? formatDate(student.initial_screening_date) : '';
        if (!dateStr.includes(columnFilters.screening_date)) {
          return false;
        }
      }
      // Vision filters
      if (columnFilters.vision_overall) {
        const overall = getVisionOverall(student);
        if (!overall.toString().toLowerCase().includes(columnFilters.vision_overall.toLowerCase())) {
          return false;
        }
      }
      if (columnFilters.vision_initial_right && !(student.vision_initial_right || '').toString().toLowerCase().includes(columnFilters.vision_initial_right.toLowerCase())) {
        return false;
      }
      if (columnFilters.vision_initial_left && !(student.vision_initial_left || '').toString().toLowerCase().includes(columnFilters.vision_initial_left.toLowerCase())) {
        return false;
      }
      if (columnFilters.vision_rescreen_right && !(student.vision_rescreen_right || '').toString().toLowerCase().includes(columnFilters.vision_rescreen_right.toLowerCase())) {
        return false;
      }
      if (columnFilters.vision_rescreen_left && !(student.vision_rescreen_left || '').toString().toLowerCase().includes(columnFilters.vision_rescreen_left.toLowerCase())) {
        return false;
      }
      // Hearing filters
      if (columnFilters.hearing_overall) {
        const overall = getHearingOverall(student);
        if (!overall.toString().toLowerCase().includes(columnFilters.hearing_overall.toLowerCase())) {
          return false;
        }
      }
      const hearingFields = [
        'hearing_initial_right_1000', 'hearing_initial_right_2000', 'hearing_initial_right_4000',
        'hearing_initial_left_1000', 'hearing_initial_left_2000', 'hearing_initial_left_4000',
        'hearing_rescreen_right_1000', 'hearing_rescreen_right_2000', 'hearing_rescreen_right_4000',
        'hearing_rescreen_left_1000', 'hearing_rescreen_left_2000', 'hearing_rescreen_left_4000'
      ];
      for (const field of hearingFields) {
        if (columnFilters[field] && !formatTestResult(student[field]).toLowerCase().includes(columnFilters[field].toLowerCase())) {
          return false;
        }
      }
      // Acanthosis filters
      if (columnFilters.acanthosis_initial && !formatTestResult(student.acanthosis_initial).toLowerCase().includes(columnFilters.acanthosis_initial.toLowerCase())) {
        return false;
      }
      if (columnFilters.acanthosis_rescreen && !formatTestResult(student.acanthosis_rescreen).toLowerCase().includes(columnFilters.acanthosis_rescreen.toLowerCase())) {
        return false;
      }
      // Scoliosis filters
      if (columnFilters.scoliosis_initial && !formatTestResult(student.scoliosis_initial).toLowerCase().includes(columnFilters.scoliosis_initial.toLowerCase())) {
        return false;
      }
      if (columnFilters.scoliosis_rescreen && !formatTestResult(student.scoliosis_rescreen).toLowerCase().includes(columnFilters.scoliosis_rescreen.toLowerCase())) {
        return false;
      }
      // Absent filter
      if (columnFilters.absent) {
        const absentStr = student.was_absent ? 'yes' : 'no';
        if (!absentStr.includes(columnFilters.absent.toLowerCase())) {
          return false;
        }
      }
      // Notes filter
      if (columnFilters.notes && !(student.notes || '').toLowerCase().includes(columnFilters.notes.toLowerCase())) {
        return false;
      }
      // Status override filter
      if (columnFilters.status_override) {
        const overrideStr = (student.status_override || '').toLowerCase();
        if (!overrideStr.includes(columnFilters.status_override.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    // Apply sorting
    if (sortConfig.column) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.column];
        let bValue = b[sortConfig.column];

        // Handle special cases
        if (sortConfig.column === 'returning') {
          aValue = a.status === 'returning' ? 'Yes' : 'No';
          bValue = b.status === 'returning' ? 'Yes' : 'No';
        } else if (sortConfig.column === 'glasses_contacts') {
          aValue = (a.glasses_or_contacts || '').toString();
          bValue = (b.glasses_or_contacts || '').toString();
        } else if (sortConfig.column === 'screening_date') {
          aValue = a.initial_screening_date || '';
          bValue = b.initial_screening_date || '';
        } else if (sortConfig.column === 'dob') {
          aValue = a.dob || '';
          bValue = b.dob || '';
        } else if (sortConfig.column === 'student_id') {
          aValue = a.unique_id || '';
          bValue = b.unique_id || '';
        } else if (sortConfig.column === 'absent') {
          aValue = a.was_absent ? 'Yes' : 'No';
          bValue = b.was_absent ? 'Yes' : 'No';
        } else if (sortConfig.column === 'notes') {
          aValue = a.notes || '';
          bValue = b.notes || '';
        } else if (sortConfig.column === 'status_override') {
          aValue = a.status_override || '';
          bValue = b.status_override || '';
        } else if (sortConfig.column === 'vision_overall') {
          aValue = getVisionOverall(a);
          bValue = getVisionOverall(b);
        } else if (sortConfig.column === 'hearing_overall') {
          aValue = getHearingOverall(a);
          bValue = getHearingOverall(b);
        }

        // Handle null/undefined values
        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        // Convert to strings for comparison
        aValue = aValue.toString().toLowerCase();
        bValue = bValue.toString().toLowerCase();

        // Compare
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [allStudents, hasSearched, filters.statusNotStarted, filters.statusCompleted, filters.statusIncomplete, filters.statusFailed, filters.statusAbsent, columnFilters, sortConfig]);

  // Apply pagination to filtered results
  const paginatedStudents = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return students.slice(start, end);
  }, [students, currentPage, pageSize]);

  const filteredTotal = students.length;
  const totalPages = Math.ceil(filteredTotal / pageSize);

  // Handle search button click
  const handleSearch = () => {
    if (!filters.startDate || !filters.endDate) {
      alert('Please select both start and end dates before searching.');
      return;
    }
    setHasSearched(true);
    setCurrentPage(0);
  };

  // Quick date filters
  const setQuickDateFilter = (type) => {
    const today = new Date();
    let start, end;
    
    switch (type) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        start = end = yesterday.toISOString().split('T')[0];
        break;
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      default:
        return;
    }
    
    // Update year filter based on the selected date range
    const year = new Date(start).getFullYear();
    setFilters({ ...filters, startDate: start, endDate: end, year: year.toString() });
    setCurrentPage(0);
    // Don't auto-trigger search, user must click Search button
  };

  // Handle cell edit - use unique_id as key
  const handleCellChange = (uniqueId, field, value) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [uniqueId]: {
        ...prev[uniqueId],
        [field]: value,
      },
    }));
  };

  // Handle row save - use unique_id
  const handleRowSave = async (uniqueId) => {
    const changes = unsavedChanges[uniqueId];
    if (!changes || Object.keys(changes).length === 0) return;

    setSavingRows(prev => ({ ...prev, [uniqueId]: true }));
    
    try {
      await updateMutation.mutateAsync({ uniqueId, data: changes });
      setUnsavedChanges(prev => {
        const newState = { ...prev };
        delete newState[uniqueId];
        return newState;
      });
      // Exit edit mode after successful save
      setEditingRowId(null);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSavingRows(prev => {
        const newState = { ...prev };
        delete newState[uniqueId];
        return newState;
      });
    }
  };

  // Handle Edit button click
  const handleEditClick = (uniqueId) => {
    setEditingRowId(uniqueId);
  };

  // Handle Cancel button click
  const handleCancelClick = (uniqueId) => {
    // Discard unsaved changes for this row
    setUnsavedChanges(prev => {
      const newState = { ...prev };
      delete newState[uniqueId];
      return newState;
    });
    // Exit edit mode
    setEditingRowId(null);
  };

  // Handle Accept button click (same as save)
  const handleAcceptClick = (uniqueId) => {
    const changes = unsavedChanges[uniqueId];
    if (!changes || Object.keys(changes).length === 0) return;
    
    setShowConfirmDialog(true);
    setConfirmMessage('Are you sure you want to save these changes?');
    setConfirmAction(() => async () => {
      await handleRowSave(uniqueId);
      setShowConfirmDialog(false);
    });
  };

  const confirmActionHandler = () => {
    if (confirmAction) {
      confirmAction();
    }
  };

  // Helper function to render sortable/filterable header
  const renderSortableHeader = (column, label, filterKey = null) => {
    const isSorted = sortConfig.column === column;
    const filterValue = filterKey ? columnFilters[filterKey] : '';
    
    return (
      <th 
        className="bg-gray-50 border-b-2 border-r border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 text-left" 
        style={{ minWidth: '70px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort(column)}>
            <span className="text-xs font-semibold">{label}</span>
            <div className="flex flex-col">
              <span className={`text-[8px] leading-none ${isSorted && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
              <span className={`text-[8px] leading-none ${isSorted && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
            </div>
          </div>
          {filterKey && (
            <input
              type="text"
              value={filterValue}
              onChange={(e) => handleColumnFilterChange(filterKey, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Filter..."
              className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
              style={{ fontSize: '10px' }}
            />
          )}
        </div>
      </th>
    );
  };

  // Handle column sorting
  const handleSort = (column) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        // Toggle direction if same column
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // New column, default to ascending
        return {
          column,
          direction: 'asc'
        };
      }
    });
    setCurrentPage(0); // Reset to first page when sorting
  };

  // Handle column filter change
  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setCurrentPage(0); // Reset to first page when filtering
  };

  // Clear all column filters
  const clearColumnFilters = () => {
    setColumnFilters({
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
      vision_initial_right: '',
      vision_initial_left: '',
      vision_rescreen_right: '',
      vision_rescreen_left: '',
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
      absent: '',
      notes: '',
      status_override: ''
    });
    setCurrentPage(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading screening data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading screening data: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-red-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Screening Dashboard</h2>
        <button
          onClick={() => refetch()}
          disabled={isLoading || !hasSearched || !filters.startDate || !filters.endDate}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Color Legend */}
      <ColorLegend />

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* School Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select
              value={filters.school}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Update filters but don't trigger search - user must click Search button
                setFilters({ ...filters, school: e.target.value });
                // Don't reset page or trigger search here
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.name}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Record Created Year</label>
            <select
              value={filters.year}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const selectedYear = e.target.value;
                // Auto-set date range to that year (for display purposes)
                // Don't trigger search - user must click Search button
                setFilters({ 
                  ...filters, 
                  year: selectedYear,
                  startDate: `${selectedYear}-01-01`,
                  endDate: `${selectedYear}-12-31`
                });
                // Don't reset page or trigger search here
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              title="Filter by the year the screening record was created (when student was intaken/imported)"
            >
              {Array.from({ length: 6 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                // Update filters but don't trigger search - user must click Search button
                setFilters({ ...filters, startDate: e.target.value });
                // Don't reset page or trigger search here
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                // Update filters but don't trigger search - user must click Search button
                setFilters({ ...filters, endDate: e.target.value });
                // Don't reset page or trigger search here
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Quick Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Filters</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuickDateFilter('today');
                }}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Today
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuickDateFilter('yesterday');
                }}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuickDateFilter('thisWeek');
                }}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuickDateFilter('thisMonth');
                }}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                This Month
              </button>
            </div>
          </div>

          {/* Search Button */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSearch();
              }}
              disabled={!filters.startDate || !filters.endDate}
              className="px-6 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[38px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            {hasSearched && (
              <button
                onClick={clearColumnFilters}
                className="px-4 py-2 text-sm font-medium bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2 h-[38px]"
                title="Clear all column filters"
              >
                Clear Column Filters
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mb-4">
            <AdvancedFilters
              filters={filters}
              onChange={(newFilters) => {
                // Update filters but don't trigger search automatically
                // User must click Search button to apply filters
                setFilters(newFilters);
                // Don't reset page or trigger search here - wait for Search button
              }}
            />
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {hasSearched && (
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700">Show:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span className="text-sm text-gray-600">
            Showing {filteredTotal > 0 ? currentPage * pageSize + 1 : 0}-{Math.min((currentPage + 1) * pageSize, filteredTotal)} of {filteredTotal} students
            {filteredTotal !== total && (
              <span className="text-gray-500"> (filtered from {total} total)</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
      )}

      {/* Spreadsheet Table - Web Optimized */}
      {!hasSearched ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-lg text-gray-600 mb-2">No search performed yet.</p>
          <p className="text-sm text-gray-500">Set your search parameters above and click "Search" to view screening data.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto" style={{ position: 'relative' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', borderSpacing: 0 }}>
            <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#f9fafb' }}>
              {/* Main Header Row */}
              <tr className="bg-gray-50" style={{ backgroundColor: '#f9fafb', margin: 0, padding: 0, borderSpacing: 0 }}>
                <th rowSpan={2} className="bg-gray-50 border-r-2 border-gray-300 px-3 py-3 text-sm font-bold text-gray-900 text-center" style={{ minWidth: '50px', backgroundColor: '#f9fafb', margin: 0, padding: '12px', borderBottom: 'none', borderTop: 'none' }}>
                  #
                </th>
                <th colSpan={9} className="bg-gray-50 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900" style={{ backgroundColor: '#f9fafb', margin: 0, padding: '8px 12px', borderBottom: 'none', borderTop: 'none' }}>
                  Student Information
                </th>
                <th colSpan={2} className="bg-gray-50 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900" style={{ backgroundColor: '#f9fafb', margin: 0, padding: '8px 12px', borderBottom: 'none', borderTop: 'none' }}>
                  Screening Details
                </th>
                <th colSpan={5} className="bg-gray-50 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900" style={{ backgroundColor: '#f9fafb', margin: 0, padding: '8px 12px', borderBottom: 'none', borderTop: 'none' }}>
                  Vision Acuity
                </th>
                <th colSpan={13} className="bg-gray-50 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900" style={{ backgroundColor: '#f9fafb', margin: 0, padding: '8px 12px', borderBottom: 'none', borderTop: 'none' }}>
                  Hearing
                </th>
                <th colSpan={2} className="bg-gray-50 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900" style={{ backgroundColor: '#f9fafb', margin: 0, padding: '8px 12px', borderBottom: 'none', borderTop: 'none' }}>
                  AN
                </th>
                <th colSpan={2} className="bg-gray-50 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900" style={{ backgroundColor: '#f9fafb', margin: 0, padding: '8px 12px', borderBottom: 'none', borderTop: 'none' }}>
                  Spinal
                </th>
                <th rowSpan={2} className="bg-gray-50 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '80px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderBottom: 'none', borderTop: 'none' }}>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('absent')}>
                      <span className="text-xs font-semibold">Absent</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'absent' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'absent' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.absent}
                      onChange={(e) => handleColumnFilterChange('absent', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                <th rowSpan={2} className="bg-gray-50 border-r border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '150px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderBottom: 'none', borderTop: 'none' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('notes')}>
                      <span className="text-xs font-semibold">Notes</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'notes' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'notes' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.notes}
                      onChange={(e) => handleColumnFilterChange('notes', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                <th rowSpan={2} className="bg-gray-50 px-3 py-3 text-sm font-bold text-gray-900 text-center" style={{ minWidth: '100px', backgroundColor: '#f9fafb', margin: 0, padding: '12px', borderBottom: 'none', borderTop: 'none' }}>
                  Actions
                </th>
              </tr>
              {/* Sub-header Row */}
              <tr className="bg-gray-50" style={{ backgroundColor: '#f9fafb', margin: 0, padding: 0, borderSpacing: 0 }}>
                {/* Student Info Columns */}
                {renderSortableHeader('grade', 'Grade', 'grade')}
                {renderSortableHeader('returning', 'Returning?', 'returning')}
                {renderSortableHeader('first_name', 'First Name', 'first_name')}
                {renderSortableHeader('last_name', 'Last Name', 'last_name')}
                {renderSortableHeader('student_id', 'Student ID', 'student_id')}
                {renderSortableHeader('gender', 'Gender', 'gender')}
                {renderSortableHeader('dob', 'DOB', 'dob')}
                {renderSortableHeader('school', 'School', 'school')}
                <th className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '100px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('teacher')}>
                      <span className="text-xs font-semibold">Teacher</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'teacher' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'teacher' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.teacher}
                      onChange={(e) => handleColumnFilterChange('teacher', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                {/* Screening Details */}
                {renderSortableHeader('glasses_contacts', 'Glasses/Contacts', 'glasses_contacts')}
                {renderSortableHeader('screening_date', 'Screening Date', 'screening_date')}
                {/* Vision Sub-headers - Overall first */}
                <th className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '70px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('vision_overall')}>
                      <span className="text-xs font-semibold">Overall</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'vision_overall' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'vision_overall' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.vision_overall || ''}
                      onChange={(e) => handleColumnFilterChange('vision_overall', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                {renderSortableHeader('vision_initial_right', 'Init R', 'vision_initial_right')}
                {renderSortableHeader('vision_initial_left', 'Init L', 'vision_initial_left')}
                {renderSortableHeader('vision_rescreen_right', 'Rescreen R', 'vision_rescreen_right')}
                <th className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '70px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('vision_rescreen_left')}>
                      <span className="text-xs font-semibold">Rescreen L</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'vision_rescreen_left' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'vision_rescreen_left' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.vision_rescreen_left}
                      onChange={(e) => handleColumnFilterChange('vision_rescreen_left', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                {/* Hearing Sub-headers - Overall first */}
                <th className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '70px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('hearing_overall')}>
                      <span className="text-xs font-semibold">Overall</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'hearing_overall' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'hearing_overall' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.hearing_overall || ''}
                      onChange={(e) => handleColumnFilterChange('hearing_overall', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                {/* Hearing Sub-headers - Initial Right (1k, 2k, 4k) */}
                {renderSortableHeader('hearing_initial_right_1000', 'Init R 1k', 'hearing_initial_right_1000')}
                {renderSortableHeader('hearing_initial_right_2000', 'Init R 2k', 'hearing_initial_right_2000')}
                {renderSortableHeader('hearing_initial_right_4000', 'Init R 4k', 'hearing_initial_right_4000')}
                {/* Hearing Sub-headers - Initial Left (1k, 2k, 4k) */}
                {renderSortableHeader('hearing_initial_left_1000', 'Init L 1k', 'hearing_initial_left_1000')}
                {renderSortableHeader('hearing_initial_left_2000', 'Init L 2k', 'hearing_initial_left_2000')}
                {renderSortableHeader('hearing_initial_left_4000', 'Init L 4k', 'hearing_initial_left_4000')}
                {/* Hearing Sub-headers - Rescreen Right (1k, 2k, 4k) */}
                {renderSortableHeader('hearing_rescreen_right_1000', 'Rescreen R 1k', 'hearing_rescreen_right_1000')}
                {renderSortableHeader('hearing_rescreen_right_2000', 'Rescreen R 2k', 'hearing_rescreen_right_2000')}
                {renderSortableHeader('hearing_rescreen_right_4000', 'Rescreen R 4k', 'hearing_rescreen_right_4000')}
                {/* Hearing Sub-headers - Rescreen Left (1k, 2k, 4k) */}
                {renderSortableHeader('hearing_rescreen_left_1000', 'Rescreen L 1k', 'hearing_rescreen_left_1000')}
                {renderSortableHeader('hearing_rescreen_left_2000', 'Rescreen L 2k', 'hearing_rescreen_left_2000')}
                <th className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '60px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('hearing_rescreen_left_4000')}>
                      <span className="text-xs font-semibold">Rescreen L 4k</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'hearing_rescreen_left_4000' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'hearing_rescreen_left_4000' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.hearing_rescreen_left_4000}
                      onChange={(e) => handleColumnFilterChange('hearing_rescreen_left_4000', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                {/* AN Sub-headers */}
                {renderSortableHeader('acanthosis_initial', 'Init', 'acanthosis_initial')}
                <th className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '70px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('acanthosis_rescreen')}>
                      <span className="text-xs font-semibold">Rescreen</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'acanthosis_rescreen' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'acanthosis_rescreen' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.acanthosis_rescreen}
                      onChange={(e) => handleColumnFilterChange('acanthosis_rescreen', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
                {/* Spinal Sub-headers */}
                {renderSortableHeader('scoliosis_initial', 'Init', 'scoliosis_initial')}
                <th className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '70px', backgroundColor: '#f9fafb', margin: 0, padding: '4px 8px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => handleSort('scoliosis_rescreen')}>
                      <span className="text-xs font-semibold">Rescreen</span>
                      <div className="flex flex-col">
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'scoliosis_rescreen' && sortConfig.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▲</span>
                        <span className={`text-[8px] leading-none ${sortConfig.column === 'scoliosis_rescreen' && sortConfig.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>▼</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnFilters.scoliosis_rescreen}
                      onChange={(e) => handleColumnFilterChange('scoliosis_rescreen', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter..."
                      className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded"
                      style={{ fontSize: '10px' }}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => {
                const uniqueId = student.unique_id || student.student_id;
                const hasUnsavedChanges = unsavedChanges[uniqueId] && Object.keys(unsavedChanges[uniqueId]).length > 0;
                const isSaving = savingRows[uniqueId];
                const isEditing = editingRowId === uniqueId;

                // Merge original data with unsaved changes
                const displayData = {
                  ...student,
                  ...(unsavedChanges[uniqueId] || {}),
                };

                // Compute status and color from displayData (includes unsaved changes) so colors update immediately
                const status = getRowStatus(displayData);
                const rowColor = getRowColor(status);
                const failed = hasFailedTest(displayData);

                return (
                  <tr key={uniqueId} className={`${rowColor} border-b border-gray-200 hover:bg-opacity-90 transition-colors ${failed ? 'ring-2 ring-red-500 border-red-500' : ''}`}>
                    {/* Row Number */}
                    <td className="bg-inherit border-r-2 border-gray-300 px-3 py-3 text-sm text-gray-600 text-center font-medium">
                      {currentPage * pageSize + index + 1}
                    </td>
                    
                    {/* Grade */}
                    <td className={`${rowColor} border-r border-gray-200 px-3 py-3`}>
                      <EditableCell
                        value={displayData.grade || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'grade', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? [
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
                        ] : []}
                        className="text-sm font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Returning? */}
                    <td className={`${rowColor} border-r border-gray-200 px-3 py-3`}>
                      <EditableCell
                        value={displayData.status === 'returning' ? 'Yes' : 'No'}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'status', value === 'Yes' ? 'returning' : 'new') : undefined}
                        type="select"
                        options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                        className="text-sm"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* First Name */}
                    <td className={`${rowColor} border-r border-gray-200 px-3 py-3`}>
                      <EditableCell
                        value={displayData.first_name}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'first_name', value) : undefined}
                        type="text"
                        className="text-sm"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Last Name */}
                    <td className={`${rowColor} border-r-2 border-gray-300 px-3 py-3`}>
                      <EditableCell
                        value={displayData.last_name}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'last_name', value) : undefined}
                        type="text"
                        className="text-sm"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Student ID */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.unique_id || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'unique_id', value) : undefined}
                        type="text"
                        className="text-sm font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Gender */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.gender}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'gender', value) : undefined}
                        type="select"
                        options={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }, { value: 'Other', label: 'Other' }]}
                        className="text-sm"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* DOB */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      {isEditing ? (
                        <EditableCell
                          value={displayData.dob ? new Date(displayData.dob).toISOString().split('T')[0] : ''}
                          onChange={(value) => handleCellChange(uniqueId, 'dob', value)}
                          type="date"
                          className="text-sm"
                        />
                      ) : (
                        <EditableCell
                          value={displayData.dob ? formatDOB(displayData.dob) : ''}
                          onChange={() => {}}
                          type="text"
                          className="text-sm"
                          disabled={true}
                        />
                      )}
                    </td>
                    
                    {/* School */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.school || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'school', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? schools.map(s => ({ value: s.name, label: s.name })) : []}
                        className="text-sm"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Teacher */}
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={displayData.teacher || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'teacher', value) : undefined}
                        type="text"
                        className="text-sm"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Glasses/Contacts */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      {isEditing ? (
                        <EditableCell
                          value={displayData.glasses_or_contacts === 'Yes' || displayData.glasses_or_contacts === true ? 'Yes' : displayData.glasses_or_contacts === 'No' || displayData.glasses_or_contacts === false ? 'No' : (displayData.glasses_or_contacts || '')}
                          onChange={(value) => handleCellChange(uniqueId, 'glasses_or_contacts', value)}
                          type="select"
                          options={[
                            { value: '', label: '' },
                            { value: 'Yes', label: 'Yes' },
                            { value: 'No', label: 'No' },
                          ]}
                          className="text-sm"
                        />
                      ) : (
                        <EditableCell
                          value={displayData.glasses_or_contacts || ''}
                          onChange={() => {}}
                          type="text"
                          className="text-sm"
                          disabled={true}
                        />
                      )}
                    </td>
                    
                    {/* Date of Screening */}
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={displayData.initial_screening_date ? new Date(displayData.initial_screening_date).toISOString().split('T')[0] : ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'initial_screening_date', value) : undefined}
                        type="date"
                        className="text-sm"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Vision Overall */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={isEditing ? (displayData.vision_overall || '') : formatTestResult(displayData.vision_overall)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'vision_overall', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-bold"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Vision Results */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.vision_initial_right || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'vision_initial_right', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? VISION_ACUITY_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.vision_initial_left || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'vision_initial_left', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? VISION_ACUITY_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.vision_rescreen_right || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'vision_rescreen_right', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? VISION_ACUITY_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={displayData.vision_rescreen_left || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'vision_rescreen_left', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? VISION_ACUITY_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Hearing Overall */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={isEditing ? (displayData.hearing_overall || '') : formatTestResult(displayData.hearing_overall)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_overall', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-bold"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Hearing Results - Initial Right (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_right_1000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_initial_right_1000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_right_2000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_initial_right_2000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_right_4000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_initial_right_4000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    {/* Hearing Results - Initial Left (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_left_1000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_initial_left_1000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_left_2000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_initial_left_2000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_left_4000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_initial_left_4000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    {/* Hearing Results - Rescreen Right (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_right_1000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_rescreen_right_1000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_right_2000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_rescreen_right_2000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_right_4000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_rescreen_right_4000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    {/* Hearing Results - Rescreen Left (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_left_1000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_rescreen_left_1000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_left_2000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_rescreen_left_2000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_left_4000)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'hearing_rescreen_left_4000', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* AN Results */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.acanthosis_initial)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'acanthosis_initial', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.acanthosis_rescreen)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'acanthosis_rescreen', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Spinal Results */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.scoliosis_initial)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'scoliosis_initial', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.scoliosis_rescreen)}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'scoliosis_rescreen', value) : undefined}
                        type={isEditing ? 'select' : 'text'}
                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                        className="text-sm text-center font-medium"
                        disabled={!isEditing}
                      />
                    </td>
                    
                    {/* Absent */}
                    <td className="border-r-2 border-gray-300 px-3 py-3 text-center">
                      {isEditing ? (
                        <EditableCell
                          value={displayData.was_absent ? 'Yes' : 'No'}
                          onChange={(value) => handleCellChange(uniqueId, 'was_absent', value === 'Yes')}
                          type="select"
                          options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                          className="text-sm"
                        />
                      ) : (
                        <EditableCell
                          value={displayData.was_absent}
                          onChange={(value) => handleCellChange(uniqueId, 'was_absent', value)}
                          type="checkbox"
                          className="text-sm"
                          disabled={true}
                        />
                      )}
                    </td>
                    
                    {/* Notes */}
                    <td className={`${rowColor} border-r-2 border-gray-300 px-3 py-3`}>
                      <EditableCell
                        value={displayData.notes || ''}
                        onChange={(value) => isEditing ? handleCellChange(uniqueId, 'notes', value) : undefined}
                        type="text"
                        className="text-sm"
                        disabled={!isEditing}
                        placeholder={isEditing ? "Add notes..." : ""}
                      />
                    </td>
                    
                    {/* Actions - Edit/Accept/Cancel */}
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          {/* Status Override */}
                          <div className="w-full">
                            <label className="block text-xs text-gray-600 mb-1">Status Override</label>
                            <EditableCell
                              value={displayData.status_override || ''}
                              onChange={(value) => handleCellChange(uniqueId, 'status_override', value || null)}
                              type="select"
                              options={[
                                { value: '', label: 'Auto (Computed)' },
                                { value: 'not_started', label: 'Not Started' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'incomplete', label: 'Incomplete' },
                                { value: 'absent', label: 'Absent' }
                              ]}
                              className="text-xs"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAcceptClick(uniqueId)}
                              disabled={isSaving}
                              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSaving ? 'Saving...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleCancelClick(uniqueId)}
                              disabled={isSaving}
                              className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(uniqueId)}
                          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog - Rendered via Portal to avoid layout shifts */}
      {showConfirmDialog && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}
          onClick={(e) => {
            // Close dialog if clicking the backdrop
            if (e.target === e.currentTarget) {
              setShowConfirmDialog(false);
              setConfirmAction(null);
              setConfirmMessage('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            style={{ position: 'relative', zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-gray-700 mb-6">{confirmMessage}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                  setConfirmMessage('');
                }}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmActionHandler}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
