import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchStudentsById, searchStudentsByName, createStudent, getSchools, updateScreening, searchStudentsWithNotes } from '../api/client';
import { getRowStatus, hasFailedTest, needsRescreen, formatDate } from '../utils/statusHelpers';
import { GRADE_OPTIONS } from '../constants/screeningOptions';
import { StudentCardExpanded } from '../components/StudentCard';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Note card component - shows a student with their notes
 */
function NoteCard({ student, onClick }) {
  const status = getRowStatus(student);
  const hasFailed = hasFailedTest(student);
  
  const statusColors = {
    not_started: 'bg-gray-50',
    completed: 'bg-green-50',
    incomplete: 'bg-amber-50',
    absent: 'bg-blue-50',
  };
  
  return (
    <div
      onClick={onClick}
      className={`${statusColors[status]} border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all ${hasFailed ? 'border-l-4 border-l-red-500' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{student.last_name}, {student.first_name}</h4>
          <p className="text-sm text-gray-500">
            {student.grade} • {student.school} • {student.teacher || 'No Teacher'}
          </p>
          {student.initial_screening_date && (
            <p className="text-xs text-gray-400 mt-1">
              Screened: {formatDate(student.initial_screening_date)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFailed && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">FAILED</span>
          )}
        </div>
      </div>
      
      {/* Notes Preview - show all_notes (combined) or individual notes */}
      {(student.all_notes || student.notes || student.initial_notes || student.rescreen_notes) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2 text-yellow-800 mb-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs font-semibold">Notes</span>
          </div>
          <p className="text-sm text-yellow-900 line-clamp-4 whitespace-pre-wrap">
            {student.all_notes || student.notes || student.initial_notes || student.rescreen_notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Students() {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('notes'); // 'search', 'add', 'notes'
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Add student state
  const [newStudent, setNewStudent] = useState({
    first_name: '',
    last_name: '',
    grade: '',
    gender: '',
    dob: '',
    school: '',
    teacher: '',
    status: 'New',
    unique_id: '',
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Notes view state
  const [notesSchool, setNotesSchool] = useState('all');
  const [notesYear, setNotesYear] = useState(new Date().getFullYear().toString());
  const [notesSearchTerm, setNotesSearchTerm] = useState('');
  
  // Selected student modal
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
  
  // Fetch students with notes using the dedicated endpoint
  const { data: notesData, isLoading: loadingNotes, refetch: refetchNotes } = useQuery({
    queryKey: ['students-notes', notesSchool, notesYear],
    queryFn: () => searchStudentsWithNotes({
      school: notesSchool === 'all' ? undefined : notesSchool,
      year: notesYear,
      hasNotes: 'yes', // Only fetch students that have notes
    }),
    refetchOnWindowFocus: false,
  });
  
  // Students with notes come pre-filtered from the API
  const studentsWithNotes = useMemo(() => {
    return notesData?.students || [];
  }, [notesData]);
  
  // Apply search term filter - search in all_notes (combined notes field)
  const filteredNotesStudents = useMemo(() => {
    if (!notesSearchTerm) return studentsWithNotes;
    const term = notesSearchTerm.toLowerCase();
    return studentsWithNotes.filter(s => 
      s.first_name?.toLowerCase().includes(term) ||
      s.last_name?.toLowerCase().includes(term) ||
      s.unique_id?.toLowerCase().includes(term) ||
      s.all_notes?.toLowerCase().includes(term) ||
      s.notes?.toLowerCase().includes(term) ||
      s.initial_notes?.toLowerCase().includes(term) ||
      s.rescreen_notes?.toLowerCase().includes(term)
    );
  }, [studentsWithNotes, notesSearchTerm]);
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ uniqueId, data }) => updateScreening(uniqueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students-notes']);
      queryClient.invalidateQueries(['screening']);
    },
  });
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: (response) => {
      toast.success(`Student created! ID: ${response?.student?.unique_id || 'N/A'}`);
      setNewStudent({
        first_name: '',
        last_name: '',
        grade: '',
        gender: '',
        dob: '',
        school: '',
        teacher: '',
        status: 'New',
        unique_id: '',
      });
    },
    onError: (err) => {
      toast.error('Failed to create student: ' + err.message);
    },
  });
  
  // Handle quick search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.warning('Enter a name or ID to search');
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      // Try ID search first, then name
      const idResult = await searchStudentsById(searchQuery);
      if (idResult?.students?.length > 0) {
        setSearchResults(idResult.students);
        toast.success(`Found ${idResult.students.length} student(s)`);
      } else {
        const nameResult = await searchStudentsByName(searchQuery, 'all');
        setSearchResults(nameResult?.students || []);
        if (nameResult?.students?.length > 0) {
          toast.success(`Found ${nameResult.students.length} student(s)`);
        } else {
          toast.info('No students found');
        }
      }
    } catch (err) {
      toast.error('Search failed: ' + err.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle add student
  const handleAddStudent = () => {
    if (!newStudent.first_name || !newStudent.last_name || !newStudent.grade || 
        !newStudent.gender || !newStudent.dob || !newStudent.school) {
      toast.warning('Please fill in all required fields');
      return;
    }
    setShowConfirmDialog(true);
  };
  
  // Handle student selection
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setEditedData({ ...student });
    setIsEditing(false);
  };
  
  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const uniqueId = editedData.unique_id || editedData.student_id;
      await updateMutation.mutateAsync({ uniqueId, data: editedData });
      toast.success('Student updated');
      setSelectedStudent(editedData);
      setIsEditing(false);
      refetchNotes();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">Search, add, and view student notes</p>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'notes' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 Students with Notes
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'search' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔍 Quick Search
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'add' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ➕ Add Student
          </button>
        </div>
        
        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Search Notes</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={notesSearchTerm}
                      onChange={(e) => setNotesSearchTerm(e.target.value)}
                      placeholder="Search by name, ID, or note content..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">School</label>
                  <select
                    value={notesSchool}
                    onChange={(e) => setNotesSchool(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Schools</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Year</label>
                  <select
                    value={notesYear}
                    onChange={(e) => setNotesYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {[2025, 2024, 2023, 2022].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => refetchNotes()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              
              {/* Results count */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-900">{filteredNotesStudents.length}</span> students with notes
                  {notesSearchTerm && ` (filtered from ${studentsWithNotes.length})`}
                </p>
              </div>
            </div>
            
            {/* Notes List */}
            {loadingNotes ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-gray-500">Loading students with notes...</p>
              </div>
            ) : filteredNotesStudents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
                <p className="text-gray-500">
                  {notesSearchTerm 
                    ? 'Try adjusting your search term'
                    : 'No students have notes for the selected filters'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotesStudents.map(student => (
                  <NoteCard
                    key={student.unique_id || student.student_id}
                    student={student}
                    onClick={() => handleSelectStudent(student)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Quick Search Tab */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Student Lookup</h2>
            
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter student ID or last name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {/* Results */}
            {hasSearched && (
              <div className="space-y-3">
                {isSearching ? (
                  <div className="text-center py-8">
                    <svg className="animate-spin h-6 w-6 text-blue-500 mx-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No students found</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-3">Found {searchResults.length} student(s)</p>
                    {searchResults.map(student => {
                      const status = getRowStatus(student);
                      const hasFailed = hasFailedTest(student);
                      return (
                        <button
                          key={student.unique_id || student.id}
                          onClick={() => handleSelectStudent(student)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                            hasFailed ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold">{student.last_name}, {student.first_name}</span>
                              <span className="text-sm text-gray-500 ml-2">
                                {student.unique_id} • {student.grade} • {student.school}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              status === 'completed' ? 'bg-green-100 text-green-700' :
                              status === 'incomplete' ? 'bg-amber-100 text-amber-700' :
                              status === 'absent' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {status === 'completed' ? 'Complete' :
                               status === 'incomplete' ? 'Incomplete' :
                               status === 'absent' ? 'Absent' : 'Not Started'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Add Student Tab */}
        {activeTab === 'add' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Add New Student</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStudent.first_name}
                  onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="First name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStudent.last_name}
                  onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Last name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Grade <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStudent.grade}
                  onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select grade</option>
                  {GRADE_OPTIONS.filter(o => o.value).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStudent.gender}
                  onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newStudent.dob}
                  onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  School <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStudent.school}
                  onChange={(e) => setNewStudent({ ...newStudent, school: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select school</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Teacher</label>
                <input
                  type="text"
                  value={newStudent.teacher}
                  onChange={(e) => setNewStudent({ ...newStudent, teacher: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Teacher last name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Student ID (optional)</label>
                <input
                  type="text"
                  value={newStudent.unique_id}
                  onChange={(e) => setNewStudent({ ...newStudent, unique_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Leave blank to auto-generate"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleAddStudent}
                disabled={createMutation.isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Creating...' : 'Create Student'}
              </button>
            </div>
          </div>
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
              onCancel={() => { setEditedData({ ...selectedStudent }); setIsEditing(false); }}
              onChange={(field, value) => setEditedData(prev => ({ ...prev, [field]: value }))}
              onClose={() => { setSelectedStudent(null); setIsEditing(false); }}
              isSaving={isSaving}
            />
          </div>
        </div>,
        document.body
      )}
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Create Student"
        message={`Create ${newStudent.first_name} ${newStudent.last_name}?`}
        onConfirm={() => {
          setShowConfirmDialog(false);
          createMutation.mutate(newStudent);
        }}
        onCancel={() => setShowConfirmDialog(false)}
        confirmText="Create"
        isLoading={createMutation.isLoading}
      />
    </div>
  );
}

