import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScreeningData, updateScreening, getSchools } from '../api/client';
import { getRowStatus, getRowColor, hasFailedTest, formatDate, formatDOB, formatTestResult } from '../utils/statusHelpers';
import EditableCell from '../components/EditableCell';
import RowSaveButton from '../components/RowSaveButton';
import AdvancedFilters from '../components/AdvancedFilters';
import ColorLegend from '../components/ColorLegend';

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Filter state - no default dates, user must set them
  const [filters, setFilters] = useState({
    school: 'all',
    startDate: '',
    endDate: '',
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
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  
  // Track if search has been triggered
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch schools
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });

  const schools = schoolsData?.schools || [];

  // Fetch screening data - only when search has been triggered
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['screening', filters, pageSize, currentPage],
    queryFn: () => getScreeningData({
      ...filters,
      limit: pageSize,
      offset: currentPage * pageSize,
    }),
    enabled: hasSearched && !!(filters.startDate && filters.endDate), // Only fetch when search is clicked and dates are set
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

  // Client-side filtering for status checkboxes (since status is computed)
  const students = useMemo(() => {
    let filtered = [...allStudents];

    // Filter by status checkboxes - only show if checkbox is checked
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

    return filtered;
  }, [allStudents, filters.statusNotStarted, filters.statusCompleted, filters.statusIncomplete, filters.statusFailed, filters.statusAbsent]);

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
    
    setFilters({ ...filters, startDate: start, endDate: end });
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
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* School Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select
              value={filters.school}
              onChange={(e) => {
                setFilters({ ...filters, school: e.target.value });
                setCurrentPage(0);
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

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setCurrentPage(0);
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
                setFilters({ ...filters, endDate: e.target.value });
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Quick Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Filters</label>
            <div className="flex gap-2">
              <button
                onClick={() => setQuickDateFilter('today')}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Today
              </button>
              <button
                onClick={() => setQuickDateFilter('yesterday')}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Yesterday
              </button>
              <button
                onClick={() => setQuickDateFilter('thisWeek')}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                This Week
              </button>
              <button
                onClick={() => setQuickDateFilter('thisMonth')}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                This Month
              </button>
            </div>
          </div>

          {/* Search Button and Edit Mode */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={!filters.startDate || !filters.endDate}
              className="px-6 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[38px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center ${
                editMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
              style={{ height: '38px' }}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mb-4">
            <AdvancedFilters
              filters={filters}
              onChange={(newFilters) => {
                setFilters(newFilters);
                setCurrentPage(0);
              }}
            />
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {hasSearched && (
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
            <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              {/* Main Header Row */}
              <tr>
                <th rowSpan={2} className="bg-gray-50 border-b-2 border-r-2 border-gray-300 px-3 py-3 text-sm font-bold text-gray-900 text-center min-w-[50px]">
                  #
                </th>
                <th colSpan={9} className="border-b-2 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 bg-blue-50">
                  Student Information
                </th>
                <th colSpan={2} className="border-b-2 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 bg-indigo-50">
                  Screening Details
                </th>
                <th colSpan={4} className="border-b-2 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 bg-blue-100">
                  Vision Acuity
                </th>
                <th colSpan={12} className="border-b-2 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 bg-green-100">
                  Hearing
                </th>
                <th colSpan={2} className="border-b-2 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 bg-yellow-100">
                  AN
                </th>
                <th colSpan={2} className="border-b-2 border-r-2 border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 bg-purple-100">
                  Spinal
                </th>
                <th rowSpan={2} className="border-b-2 border-r-2 border-gray-300 px-3 py-3 text-sm font-bold text-gray-900 text-center min-w-[80px]">
                  Absent
                </th>
                <th rowSpan={2} className="border-b-2 border-gray-300 px-3 py-3 text-sm font-bold text-gray-900 text-center min-w-[100px]">
                  Actions
                </th>
              </tr>
              {/* Sub-header Row */}
              <tr>
                {/* Student Info Columns */}
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[70px]">
                  Grade
                </th>
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[90px]">
                  Returning?
                </th>
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[120px]">
                  First Name
                </th>
                <th className="sticky left-0 bg-gray-50 border-b border-r-2 border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[120px] z-20">
                  Last Name
                </th>
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[100px]">
                  Student ID
                </th>
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[70px]">
                  Gender
                </th>
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[110px]">
                  DOB
                </th>
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[100px]">
                  School
                </th>
                <th className="border-b border-r-2 border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[100px]">
                  Teacher
                </th>
                {/* Screening Details */}
                <th className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[130px]">
                  Glasses/Contacts
                </th>
                <th className="border-b border-r-2 border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[130px]">
                  Screening Date
                </th>
                {/* Vision Sub-headers */}
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Init R
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Init L
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Rescreen R
                </th>
                <th className="border-b border-r-2 border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Rescreen L
                </th>
                {/* Hearing Sub-headers - Initial Right (1k, 2k, 4k) */}
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Init R 1k
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Init R 2k
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Init R 4k
                </th>
                {/* Hearing Sub-headers - Initial Left (1k, 2k, 4k) */}
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Init L 1k
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Init L 2k
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Init L 4k
                </th>
                {/* Hearing Sub-headers - Rescreen Right (1k, 2k, 4k) */}
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Rescreen R 1k
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Rescreen R 2k
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Rescreen R 4k
                </th>
                {/* Hearing Sub-headers - Rescreen Left (1k, 2k, 4k) */}
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Rescreen L 1k
                </th>
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Rescreen L 2k
                </th>
                <th className="border-b border-r-2 border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[60px]">
                  Rescreen L 4k
                </th>
                {/* AN Sub-headers */}
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Init
                </th>
                <th className="border-b border-r-2 border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Rescreen
                </th>
                {/* Spinal Sub-headers */}
                <th className="border-b border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Init
                </th>
                <th className="border-b border-r-2 border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 text-center min-w-[70px]">
                  Rescreen
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => {
                const status = getRowStatus(student);
                const rowColor = getRowColor(status);
                const uniqueId = student.unique_id || student.student_id;
                const hasUnsavedChanges = unsavedChanges[uniqueId] && Object.keys(unsavedChanges[uniqueId]).length > 0;
                const isSaving = savingRows[uniqueId];
                const failed = hasFailedTest(student);

                // Merge original data with unsaved changes
                const displayData = {
                  ...student,
                  ...(unsavedChanges[uniqueId] || {}),
                };

                return (
                  <tr key={uniqueId} className={`${rowColor} border-b border-gray-200 hover:bg-opacity-90 transition-colors ${failed ? 'ring-2 ring-red-500 border-red-500' : ''}`}>
                    {/* Row Number */}
                    <td className="bg-inherit border-r-2 border-gray-300 px-3 py-3 text-sm text-gray-600 text-center font-medium">
                      {currentPage * pageSize + index + 1}
                    </td>
                    
                    {/* Grade */}
                    <td className="bg-inherit border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.grade}
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'grade', value) : undefined}
                        type="text"
                        className="text-sm font-medium"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* Returning? */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.status === 'returning' ? 'Yes' : 'No'}
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'status', value === 'Yes' ? 'returning' : 'new') : undefined}
                        type="select"
                        options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                        className="text-sm"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* First Name */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.first_name}
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'first_name', value) : undefined}
                        type="text"
                        className="text-sm"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* Last Name - Sticky */}
                    <td className="sticky left-0 bg-inherit border-r-2 border-gray-300 px-3 py-3 z-20">
                      <EditableCell
                        value={displayData.last_name}
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'last_name', value) : undefined}
                        type="text"
                        className="text-sm"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* Student ID */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.unique_id || ''}
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'unique_id', value) : undefined}
                        type="text"
                        className="text-sm font-medium"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* Gender */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.gender}
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'gender', value) : undefined}
                        type="select"
                        options={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }, { value: 'Other', label: 'Other' }]}
                        className="text-sm"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* DOB */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      {editMode ? (
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
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'school', value) : undefined}
                        type={editMode ? 'select' : 'text'}
                        options={editMode ? schools.map(s => ({ value: s.name, label: s.name })) : []}
                        className="text-sm"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* Teacher */}
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={displayData.teacher || ''}
                        onChange={(value) => editMode ? handleCellChange(uniqueId, 'teacher', value) : undefined}
                        type="text"
                        className="text-sm"
                        disabled={!editMode}
                      />
                    </td>
                    
                    {/* Glasses/Contacts */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={displayData.glasses_or_contacts || ''}
                        onChange={(value) => handleCellChange(uniqueId, 'glasses_or_contacts', value)}
                        type="text"
                        className="text-sm"
                      />
                    </td>
                    
                    {/* Date of Screening */}
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={displayData.initial_screening_date ? new Date(displayData.initial_screening_date).toISOString().split('T')[0] : ''}
                        onChange={(value) => handleCellChange(uniqueId, 'initial_screening_date', value)}
                        type="date"
                        className="text-sm"
                      />
                    </td>
                    
                    {/* Vision Results */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.vision_initial_right)}
                        onChange={(value) => handleCellChange(uniqueId, 'vision_initial_right', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.vision_initial_left)}
                        onChange={(value) => handleCellChange(uniqueId, 'vision_initial_left', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.vision_rescreen_right)}
                        onChange={(value) => handleCellChange(uniqueId, 'vision_rescreen_right', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.vision_rescreen_left)}
                        onChange={(value) => handleCellChange(uniqueId, 'vision_rescreen_left', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    
                    {/* Hearing Results - Initial Right (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_right_1000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_initial_right_1000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_right_2000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_initial_right_2000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_right_4000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_initial_right_4000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    {/* Hearing Results - Initial Left (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_left_1000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_initial_left_1000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_left_2000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_initial_left_2000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_initial_left_4000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_initial_left_4000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    {/* Hearing Results - Rescreen Right (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_right_1000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_rescreen_right_1000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_right_2000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_rescreen_right_2000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_right_4000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_rescreen_right_4000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    {/* Hearing Results - Rescreen Left (1k, 2k, 4k) */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_left_1000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_rescreen_left_1000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_left_2000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_rescreen_left_2000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.hearing_rescreen_left_4000)}
                        onChange={(value) => handleCellChange(uniqueId, 'hearing_rescreen_left_4000', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    
                    {/* AN Results */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.acanthosis_initial)}
                        onChange={(value) => handleCellChange(uniqueId, 'acanthosis_initial', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.acanthosis_rescreen)}
                        onChange={(value) => handleCellChange(uniqueId, 'acanthosis_rescreen', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    
                    {/* Spinal Results */}
                    <td className="border-r border-gray-200 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.scoliosis_initial)}
                        onChange={(value) => handleCellChange(uniqueId, 'scoliosis_initial', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    <td className="border-r-2 border-gray-300 px-3 py-3">
                      <EditableCell
                        value={formatTestResult(displayData.scoliosis_rescreen)}
                        onChange={(value) => handleCellChange(uniqueId, 'scoliosis_rescreen', value)}
                        type="text"
                        className="text-sm text-center font-medium"
                      />
                    </td>
                    
                    {/* Absent */}
                    <td className="border-r-2 border-gray-300 px-3 py-3 text-center">
                      {editMode ? (
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
                        />
                      )}
                    </td>
                    
                    {/* Save Button */}
                    <td className="px-3 py-3 text-center">
                      {hasUnsavedChanges && (
                        <RowSaveButton
                          onSave={() => handleRowSave(uniqueId)}
                          isSaving={isSaving}
                        />
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
    </div>
  );
}
