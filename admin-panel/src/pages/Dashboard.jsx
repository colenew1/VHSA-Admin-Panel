import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScreeningData, updateScreening, getSchools } from '../api/client';
import { getRowStatus, hasFailedTest, needsRescreen } from '../utils/statusHelpers';
import { StudentCardCompact, StudentCardExpanded } from '../components/StudentCard';
import { useToast } from '../components/Toast';

/**
 * Stat card component for the summary section
 */
function StatCard({ label, value, icon, color, isActive, onClick }) {
  const colors = {
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', accent: 'text-gray-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', accent: 'text-green-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: 'text-amber-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'text-red-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', accent: 'text-purple-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'text-blue-500' },
  };
  
  const c = colors[color] || colors.gray;
  
  return (
    <button
      onClick={onClick}
      className={`
        ${c.bg} ${c.border} border-2 rounded-xl p-4 text-left transition-all duration-200
        ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}
        flex-1 min-w-[140px]
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl ${c.accent}`}>{icon}</span>
        {isActive && (
          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </button>
  );
}

/**
 * Filter chip component
 */
function FilterChip({ label, isActive, onClick, onClear }) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
        ${isActive 
          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
        }
      `}
    >
      {label}
      {isActive && onClear && (
        <span
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      )}
    </button>
  );
}

export default function DashboardNew() {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Core filters
  const [school, setSchool] = useState('all');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null); // null = all, or 'completed', 'incomplete', etc.
  const [showFailed, setShowFailed] = useState(false);
  const [showRescreen, setShowRescreen] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, grade, date, status
  const [sortDir, setSortDir] = useState('asc');
  
  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Selected student for expanded view
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch schools
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });
  const schools = schoolsData?.schools || [];
  
  // Fetch screening data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['screening', school, year, pageSize, currentPage],
    queryFn: () => getScreeningData({
      school: school,
      year: year,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      limit: 1000, // Get more data for client-side filtering
      offset: 0,
    }),
    refetchOnWindowFocus: false,
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ uniqueId, data }) => updateScreening(uniqueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['screening']);
    },
  });
  
  const allStudents = data?.data || [];
  
  // Standard grade order
  const GRADE_ORDER = ['Pre-K (3)', 'Pre-K (4)', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  
  // Get grades that exist in the current data, sorted properly
  const grades = useMemo(() => {
    const gradeSet = new Set();
    allStudents.forEach(s => {
      if (s.grade) gradeSet.add(s.grade);
    });
    // Sort by the defined order
    return GRADE_ORDER.filter(g => gradeSet.has(g));
  }, [allStudents]);
  
  // Compute stats
  const stats = useMemo(() => {
    const s = {
      total: allStudents.length,
      completed: 0,
      incomplete: 0,
      notStarted: 0,
      failed: 0,
      rescreen: 0,
      absent: 0,
    };
    
    allStudents.forEach(student => {
      const status = getRowStatus(student);
      if (status === 'completed') s.completed++;
      else if (status === 'incomplete') s.incomplete++;
      else if (status === 'not_started') s.notStarted++;
      else if (status === 'absent') s.absent++;
      
      if (hasFailedTest(student)) s.failed++;
      if (needsRescreen(student)) s.rescreen++;
    });
    
    return s;
  }, [allStudents]);
  
  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = [...allStudents];
    
    // Search by name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.first_name?.toLowerCase().includes(query) ||
        s.last_name?.toLowerCase().includes(query) ||
        s.unique_id?.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(s => getRowStatus(s) === statusFilter);
    }
    
    // Filter by failed
    if (showFailed) {
      filtered = filtered.filter(s => hasFailedTest(s));
    }
    
    // Filter by needs rescreen
    if (showRescreen) {
      filtered = filtered.filter(s => needsRescreen(s));
    }
    
    // Filter by grade
    if (gradeFilter && gradeFilter !== 'all') {
      filtered = filtered.filter(s => s.grade === gradeFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
          bVal = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
          break;
        case 'grade':
          // Sort grades in logical order
          aVal = GRADE_ORDER.indexOf(a.grade);
          bVal = GRADE_ORDER.indexOf(b.grade);
          if (aVal === -1) aVal = 999;
          if (bVal === -1) bVal = 999;
          break;
        case 'date':
          aVal = a.initial_screening_date || '';
          bVal = b.initial_screening_date || '';
          break;
        case 'status':
          const statusOrder = { not_started: 0, incomplete: 1, completed: 2, absent: 3 };
          aVal = statusOrder[getRowStatus(a)] ?? 99;
          bVal = statusOrder[getRowStatus(b)] ?? 99;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [allStudents, searchQuery, statusFilter, showFailed, showRescreen, gradeFilter, sortBy, sortDir]);
  
  // Paginate
  const paginatedStudents = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);
  
  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  
  // Handle student selection
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setEditedData({ ...student });
    setIsEditing(false);
  };
  
  // Handle edit change
  const handleEditChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const uniqueId = editedData.unique_id || editedData.student_id;
      await updateMutation.mutateAsync({ uniqueId, data: editedData });
      toast.success('Student updated successfully');
      setSelectedStudent(editedData);
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedData({ ...selectedStudent });
    setIsEditing(false);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setStatusFilter(null);
    setShowFailed(false);
    setShowRescreen(false);
    setSearchQuery('');
    setGradeFilter('all');
  };
  
  const hasActiveFilters = statusFilter || showFailed || showRescreen || searchQuery || gradeFilter !== 'all';
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Screening Dashboard</h1>
              <p className="text-sm text-gray-500">
                {school === 'all' ? 'All Schools' : school} • {year}
              </p>
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-3">
              <select
                value={school}
                onChange={(e) => { setSchool(e.target.value); setCurrentPage(0); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              
              <select
                value={year}
                onChange={(e) => { setYear(e.target.value); setCurrentPage(0); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {[2025, 2024, 2023, 2022].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              
              <button
                onClick={() => refetch()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="flex flex-wrap gap-4 mb-6">
          <StatCard
            label="Total Students"
            value={stats.total}
            icon="👥"
            color="gray"
            isActive={!statusFilter && !showFailed && !showRescreen}
            onClick={clearFilters}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon="✓"
            color="green"
            isActive={statusFilter === 'completed'}
            onClick={() => { setStatusFilter(statusFilter === 'completed' ? null : 'completed'); setShowFailed(false); setShowRescreen(false); }}
          />
          <StatCard
            label="Incomplete"
            value={stats.incomplete}
            icon="⚠"
            color="amber"
            isActive={statusFilter === 'incomplete'}
            onClick={() => { setStatusFilter(statusFilter === 'incomplete' ? null : 'incomplete'); setShowFailed(false); setShowRescreen(false); }}
          />
          <StatCard
            label="Failed"
            value={stats.failed}
            icon="✗"
            color="red"
            isActive={showFailed}
            onClick={() => { setShowFailed(!showFailed); setStatusFilter(null); setShowRescreen(false); }}
          />
          <StatCard
            label="Needs Rescreen"
            value={stats.rescreen}
            icon="↻"
            color="purple"
            isActive={showRescreen}
            onClick={() => { setShowRescreen(!showRescreen); setStatusFilter(null); setShowFailed(false); }}
          />
          <StatCard
            label="Absent"
            value={stats.absent}
            icon="○"
            color="blue"
            isActive={statusFilter === 'absent'}
            onClick={() => { setStatusFilter(statusFilter === 'absent' ? null : 'absent'); setShowFailed(false); setShowRescreen(false); }}
          />
        </div>
        
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          {/* Row 1: Search + Dropdowns */}
          <div className="flex flex-col lg:flex-row gap-3 mb-3">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setCurrentPage(0); }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            >
              <option value="all">All Grades</option>
              {grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            
            {/* Sort */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort: Name</option>
                <option value="grade">Sort: Grade</option>
                <option value="date">Sort: Date</option>
                <option value="status">Sort: Status</option>
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2.5 border border-l-0 border-gray-300 rounded-r-lg text-sm hover:bg-gray-50"
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          
          {/* Row 2: Quick Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Quick filters:</span>
            <FilterChip
              label="Not Started"
              isActive={statusFilter === 'not_started'}
              onClick={() => setStatusFilter(statusFilter === 'not_started' ? null : 'not_started')}
              onClear={() => setStatusFilter(null)}
            />
            <FilterChip
              label="Incomplete"
              isActive={statusFilter === 'incomplete'}
              onClick={() => setStatusFilter(statusFilter === 'incomplete' ? null : 'incomplete')}
              onClear={() => setStatusFilter(null)}
            />
            <FilterChip
              label="Failed Tests"
              isActive={showFailed}
              onClick={() => setShowFailed(!showFailed)}
              onClear={() => setShowFailed(false)}
            />
            <FilterChip
              label="Needs Rescreen"
              isActive={showRescreen}
              onClick={() => setShowRescreen(!showRescreen)}
              onClear={() => setShowRescreen(false)}
            />
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-2"
              >
                Clear all
              </button>
            )}
          </div>
          
          {/* Row 3: Results count and pagination */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{paginatedStudents.length}</span> of{' '}
              <span className="font-medium text-gray-900">{filteredStudents.length}</span> students
              {hasActiveFilters && ' (filtered)'}
            </p>
            
            {/* Page size */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Per page:</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-gray-500">Loading screening data...</p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 mb-2">Failed to load data: {error.message}</p>
            <button onClick={() => refetch()} className="text-red-600 hover:underline">
              Try again
            </button>
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !error && filteredStudents.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search query'
                : 'No screening data available for this selection'
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
        
        {/* Student Cards Grid */}
        {!isLoading && !error && filteredStudents.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedStudents.map(student => (
                <StudentCardCompact
                  key={student.unique_id || student.student_id}
                  student={student}
                  onClick={() => handleSelectStudent(student)}
                  isSelected={selectedStudent?.unique_id === student.unique_id}
                />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(0)}
                  disabled={currentPage === 0}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages - 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Last
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Student Detail Modal */}
      {selectedStudent && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setSelectedStudent(null); setIsEditing(false); }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <StudentCardExpanded
              student={isEditing ? editedData : selectedStudent}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              onChange={handleEditChange}
              onClose={() => { setSelectedStudent(null); setIsEditing(false); }}
              isSaving={isSaving}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

