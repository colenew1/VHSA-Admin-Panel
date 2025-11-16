import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchStudentsById, searchStudentsByName, getStudentByUniqueId, createStudent, getSchools, updateScreening } from '../api/client';
import { getRowStatus, getRowColor, hasFailedTest, formatDate, formatDOB, formatTestResult } from '../utils/statusHelpers';
import EditableCell from '../components/EditableCell';

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

// Grade options - must match database format exactly
const GRADE_OPTIONS = [
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

export default function Search() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'add'
  const [searchType, setSearchType] = useState('id'); // 'id' or 'name'
  const [searchStudentId, setSearchStudentId] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchSchool, setSearchSchool] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Add Student form state
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

  // Fetch schools
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });

  const schools = schoolsData?.schools || [];

  // Get selected student details
  const { data: studentDetails, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', selectedStudent],
    queryFn: () => getStudentByUniqueId(selectedStudent),
    enabled: !!selectedStudent,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ uniqueId, data }) => updateScreening(uniqueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['student', selectedStudent]);
      queryClient.invalidateQueries(['searchById']);
      queryClient.invalidateQueries(['searchByName']);
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['searchById']);
      queryClient.invalidateQueries(['searchByName']);
    },
  });

  const isLoading = isSearching || loadingStudent;

  const handleSearch = async () => {
    // Determine search type based on which field has input
    const useIdSearch = searchStudentId.trim() && !searchLastName.trim();
    const useNameSearch = searchLastName.trim();
    
    if (!useIdSearch && !useNameSearch) {
      alert('Please enter either a Student ID or Last Name');
      return;
    }
    
    setHasSearched(true);
    setSelectedStudent(null);
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      let result;
      if (useIdSearch) {
        setSearchType('id');
        result = await searchStudentsById(searchStudentId);
      } else if (useNameSearch) {
        setSearchType('name');
        result = await searchStudentsByName(searchLastName, searchSchool);
      }
      
      if (result && result.students) {
        setSearchResults(result.students);
        if (result.students.length === 0) {
          alert('No students found matching your search.');
        }
      } else {
        setSearchResults([]);
        alert('No students found matching your search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Search failed. Please try again.';
      alert(`Search failed: ${errorMessage}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setHasSearched(false);
    setSelectedStudent(null);
    setSearchStudentId('');
    setSearchLastName('');
    setSearchSchool('all');
    setEditingRowId(null);
    setUnsavedChanges({});
    setSearchResults([]);
  };

  const handleSelectStudent = (uniqueId) => {
    setSelectedStudent(uniqueId);
    setEditingRowId(null);
    setUnsavedChanges({});
  };

  const handleCellChange = (field, value) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedStudent || Object.keys(unsavedChanges).length === 0) return;

    setShowConfirmDialog(true);
    setConfirmMessage('Are you sure you want to save these changes?');
    setConfirmAction(() => async () => {
      setSavingRows(prev => ({ ...prev, [selectedStudent]: true }));
      try {
        await updateMutation.mutateAsync({ uniqueId: selectedStudent, data: unsavedChanges });
        setUnsavedChanges({});
        setEditingRowId(null);
      } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save changes. Please try again.');
      } finally {
        setSavingRows(prev => {
          const newState = { ...prev };
          delete newState[selectedStudent];
          return newState;
        });
      }
      setShowConfirmDialog(false);
    });
  };

  const handleCancel = () => {
    setUnsavedChanges({});
    setEditingRowId(null);
  };

  const handleEditClick = () => {
    setEditingRowId(selectedStudent);
  };

  const handleAddStudent = () => {
    // Validate required fields
    if (!newStudent.first_name || !newStudent.last_name || !newStudent.grade || 
        !newStudent.gender || !newStudent.dob || !newStudent.school || !newStudent.status) {
      alert('Please fill in all required fields');
      return;
    }

    setShowConfirmDialog(true);
    setConfirmMessage('Are you sure you want to add this student?');
    setConfirmAction(() => async () => {
      try {
        await createStudentMutation.mutateAsync(newStudent);
        alert('Student added successfully!');
        // Reset form
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
        // Switch to search tab
        setActiveTab('search');
      } catch (error) {
        console.error('Create error:', error);
        alert('Failed to add student. Please try again.');
      }
      setShowConfirmDialog(false);
    });
  };

  const confirmActionHandler = () => {
    if (confirmAction) {
      confirmAction();
    }
  };

  // Transform student data for display (combine student + screening)
  const getDisplayData = () => {
    if (!studentDetails) return null;
    
    const student = studentDetails.student;
    const screening = studentDetails.screening || {};
    
    const baseData = {
      ...student,
      ...screening,
      // Map screening fields to match dashboard format
      glasses_or_contacts: screening.vision_initial_glasses || screening.vision_rescreen_glasses || null,
      vision_initial_right: screening.vision_initial_right_eye || null,
      vision_initial_left: screening.vision_initial_left_eye || null,
      vision_rescreen_right: screening.vision_rescreen_right_eye || null,
      vision_rescreen_left: screening.vision_rescreen_left_eye || null,
      hearing_initial_right_1000: screening.hearing_initial_right_1000 || null,
      hearing_initial_right_2000: screening.hearing_initial_right_2000 || null,
      hearing_initial_right_4000: screening.hearing_initial_right_4000 || null,
      hearing_initial_left_1000: screening.hearing_initial_left_1000 || null,
      hearing_initial_left_2000: screening.hearing_initial_left_2000 || null,
      hearing_initial_left_4000: screening.hearing_initial_left_4000 || null,
      hearing_rescreen_right_1000: screening.hearing_rescreen_right_1000 || null,
      hearing_rescreen_right_2000: screening.hearing_rescreen_right_2000 || null,
      hearing_rescreen_right_4000: screening.hearing_rescreen_right_4000 || null,
      hearing_rescreen_left_1000: screening.hearing_rescreen_left_1000 || null,
      hearing_rescreen_left_2000: screening.hearing_rescreen_left_2000 || null,
      hearing_rescreen_left_4000: screening.hearing_rescreen_left_4000 || null,
      acanthosis_initial: screening.acanthosis_initial_result || null,
      acanthosis_rescreen: screening.acanthosis_rescreen_result || null,
      scoliosis_initial: screening.scoliosis_initial_result || null,
      scoliosis_rescreen: screening.scoliosis_rescreen_result || null,
    };
    
    // Merge with unsaved changes
    return {
      ...baseData,
      ...unsavedChanges,
    };
  };

  const displayData = getDisplayData();
  const isEditing = editingRowId === selectedStudent;
  const status = displayData ? getRowStatus(displayData) : null;
  const rowColor = status ? getRowColor(status) : 'bg-white';
  const failed = displayData ? hasFailedTest(displayData) : false;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('search');
              handleReset();
            }}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Search Student
          </button>
          <button
            onClick={() => {
              setActiveTab('add');
              handleReset();
            }}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'add'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Add Student
          </button>
        </div>

        {/* Search Tab Content */}
        {activeTab === 'search' && (
          <div className="p-6">
            {!selectedStudent ? (
              <>
                {/* Search Interface */}
                <div className="space-y-6">
                  {/* Search by Student ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search by Student ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchStudentId}
                        onChange={(e) => setSearchStudentId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter Student ID"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Search
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-sm text-gray-500">OR</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  {/* Search by Name */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search by Name
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={searchLastName}
                        onChange={(e) => setSearchLastName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Last Name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <select
                        value={searchSchool}
                        onChange={(e) => setSearchSchool(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">Select School</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.name}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isLoading}
                      className="w-full px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Search by Last Name
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {hasSearched && (
                  <div className="mt-6">
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <p className="mt-2 text-gray-600">Searching...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-8 text-gray-600">
                        No students found matching your search.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Found {searchResults.length} student{searchResults.length !== 1 ? 's' : ''}
                          </h3>
                          <button
                            onClick={handleReset}
                            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="space-y-2">
                          {searchResults.map((result) => {
                            const student = result;
                            const screening = result.screening;
                            const studentStatus = screening ? getRowStatus({ ...student, ...screening }) : 'not_started';
                            const studentColor = getRowColor(studentStatus);
                            const studentFailed = screening ? hasFailedTest({ ...student, ...screening }) : false;
                            
                            return (
                              <button
                                key={student.unique_id || student.id}
                                onClick={() => handleSelectStudent(student.unique_id)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                                  studentFailed
                                    ? 'border-red-500 bg-red-50'
                                    : `border-gray-200 ${studentColor}`
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {student.last_name}, {student.first_name}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {student.unique_id && `ID: ${student.unique_id}`} • {student.grade} • {student.school}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-xs px-2 py-1 rounded ${
                                      studentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                      studentStatus === 'incomplete' ? 'bg-amber-100 text-amber-800' :
                                      studentStatus === 'absent' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {studentStatus === 'completed' ? 'Completed' :
                                       studentStatus === 'incomplete' ? 'Incomplete' :
                                       studentStatus === 'absent' ? 'Absent' :
                                       'Not Started'}
                                    </div>
                                    {studentFailed && (
                                      <div className="text-xs text-red-600 font-semibold mt-1">
                                        Failed Test
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Individual Student View */
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Loading student details...</p>
                  </div>
                ) : displayData ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {displayData.last_name}, {displayData.first_name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {displayData.unique_id && `ID: ${displayData.unique_id}`} • {displayData.grade} • {displayData.school}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReset}
                          className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                          Reset
                        </button>
                        {!isEditing ? (
                          <button
                            onClick={handleEditClick}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleCancel}
                              className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={Object.keys(unsavedChanges).length === 0 || savingRows[selectedStudent]}
                              className="px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingRows[selectedStudent] ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Student Information Card */}
                    <div className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                      failed ? 'border-red-500' : 'border-gray-200'
                    }`}>
                      {failed && (
                        <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 rounded-lg">
                          <p className="text-red-800 font-semibold">⚠️ This student has failed test(s)</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                            Student Information
                          </h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <EditableCell
                              value={displayData.first_name || ''}
                              onChange={(value) => isEditing ? handleCellChange('first_name', value) : undefined}
                              type="text"
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <EditableCell
                              value={displayData.last_name || ''}
                              onChange={(value) => isEditing ? handleCellChange('last_name', value) : undefined}
                              type="text"
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                            <EditableCell
                              value={displayData.unique_id || ''}
                              onChange={(value) => isEditing ? handleCellChange('unique_id', value) : undefined}
                              type="text"
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                            <EditableCell
                              value={displayData.grade || ''}
                              onChange={(value) => isEditing ? handleCellChange('grade', value) : undefined}
                              type={isEditing ? 'select' : 'text'}
                              options={isEditing ? GRADE_OPTIONS : []}
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <EditableCell
                              value={displayData.gender || ''}
                              onChange={(value) => isEditing ? handleCellChange('gender', value) : undefined}
                              type="select"
                              options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                            {isEditing ? (
                              <EditableCell
                                value={displayData.dob ? new Date(displayData.dob).toISOString().split('T')[0] : ''}
                                onChange={(value) => handleCellChange('dob', value)}
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
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                            School Information
                          </h3>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                            <EditableCell
                              value={displayData.school || ''}
                              onChange={(value) => isEditing ? handleCellChange('school', value) : undefined}
                              type={isEditing ? 'select' : 'text'}
                              options={isEditing ? schools.map(s => ({ value: s.name, label: s.name })) : []}
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                            <EditableCell
                              value={displayData.teacher || ''}
                              onChange={(value) => isEditing ? handleCellChange('teacher', value) : undefined}
                              type="text"
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <EditableCell
                              value={displayData.status === 'Returning' ? 'Yes' : 'No'}
                              onChange={(value) => isEditing ? handleCellChange('status', value === 'Yes' ? 'Returning' : 'New') : undefined}
                              type="select"
                              options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Screening Date</label>
                            <EditableCell
                              value={displayData.initial_screening_date ? new Date(displayData.initial_screening_date).toISOString().split('T')[0] : ''}
                              onChange={(value) => isEditing ? handleCellChange('initial_screening_date', value) : undefined}
                              type="date"
                              className="text-sm"
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Absent</label>
                            {isEditing ? (
                              <EditableCell
                                value={displayData.was_absent ? 'Yes' : 'No'}
                                onChange={(value) => handleCellChange('was_absent', value === 'Yes')}
                                type="select"
                                options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                                className="text-sm"
                              />
                            ) : (
                              <EditableCell
                                value={displayData.was_absent}
                                onChange={() => {}}
                                type="checkbox"
                                className="text-sm"
                                disabled={true}
                              />
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Glasses/Contacts</label>
                            {isEditing ? (
                              <EditableCell
                                value={displayData.glasses_or_contacts === 'Yes' || displayData.glasses_or_contacts === true ? 'Yes' : displayData.glasses_or_contacts === 'No' || displayData.glasses_or_contacts === false ? 'No' : (displayData.glasses_or_contacts || '')}
                                onChange={(value) => handleCellChange('glasses_or_contacts', value)}
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
                          </div>
                        </div>
                      </div>

                      {/* Screening Results Table */}
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Screening Results</h3>
                        
                        <div className="max-w-4xl">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" style={{ borderCollapse: 'collapse', borderSpacing: 0 }}>
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700" style={{ minWidth: '120px' }}>Test</th>
                                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700" style={{ minWidth: '100px' }}>Initial Right</th>
                                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700" style={{ minWidth: '100px' }}>Initial Left</th>
                                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700" style={{ minWidth: '100px' }}>Rescreen Right</th>
                                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700" style={{ minWidth: '100px' }}>Rescreen Left</th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Vision Acuity Row */}
                                <tr>
                                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700 bg-gray-50">Vision Acuity</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <EditableCell
                                      value={displayData.vision_initial_right || ''}
                                      onChange={(value) => isEditing ? handleCellChange('vision_initial_right', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? VISION_ACUITY_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <EditableCell
                                      value={displayData.vision_initial_left || ''}
                                      onChange={(value) => isEditing ? handleCellChange('vision_initial_left', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? VISION_ACUITY_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <EditableCell
                                      value={displayData.vision_rescreen_right || ''}
                                      onChange={(value) => isEditing ? handleCellChange('vision_rescreen_right', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? VISION_ACUITY_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <EditableCell
                                      value={displayData.vision_rescreen_left || ''}
                                      onChange={(value) => isEditing ? handleCellChange('vision_rescreen_left', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? VISION_ACUITY_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                </tr>
                                
                                {/* Hearing Rows */}
                                <tr>
                                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700 bg-gray-50" rowSpan={4}>Hearing</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">1k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_initial_right_1000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_initial_right_1000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">1k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_initial_left_1000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_initial_left_1000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">1k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_rescreen_right_1000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_rescreen_right_1000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">1k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_rescreen_left_1000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_rescreen_left_1000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">2k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_initial_right_2000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_initial_right_2000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">2k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_initial_left_2000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_initial_left_2000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">2k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_rescreen_right_2000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_rescreen_right_2000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">2k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_rescreen_left_2000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_rescreen_left_2000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">4k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_initial_right_4000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_initial_right_4000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">4k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_initial_left_4000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_initial_left_4000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">4k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_rescreen_right_4000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_rescreen_right_4000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-500">4k</div>
                                      <EditableCell
                                        value={formatTestResult(displayData.hearing_rescreen_left_4000)}
                                        onChange={(value) => isEditing ? handleCellChange('hearing_rescreen_left_4000', value) : undefined}
                                        type={isEditing ? 'select' : 'text'}
                                        options={isEditing ? TEST_RESULT_OPTIONS : []}
                                        className="text-sm text-center font-medium w-full"
                                        disabled={!isEditing}
                                      />
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-600 text-xs" colSpan={4}>All frequencies (1k, 2k, 4k) shown above</td>
                                </tr>
                                
                                {/* AN Row */}
                                <tr>
                                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700 bg-gray-50">AN (Acanthosis)</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center" colSpan={2}>
                                    <EditableCell
                                      value={formatTestResult(displayData.acanthosis_initial)}
                                      onChange={(value) => isEditing ? handleCellChange('acanthosis_initial', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? TEST_RESULT_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center" colSpan={2}>
                                    <EditableCell
                                      value={formatTestResult(displayData.acanthosis_rescreen)}
                                      onChange={(value) => isEditing ? handleCellChange('acanthosis_rescreen', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? TEST_RESULT_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                </tr>
                                
                                {/* Spinal Row */}
                                <tr>
                                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700 bg-gray-50">Spinal (Scoliosis)</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center" colSpan={2}>
                                    <EditableCell
                                      value={formatTestResult(displayData.scoliosis_initial)}
                                      onChange={(value) => isEditing ? handleCellChange('scoliosis_initial', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? TEST_RESULT_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center" colSpan={2}>
                                    <EditableCell
                                      value={formatTestResult(displayData.scoliosis_rescreen)}
                                      onChange={(value) => isEditing ? handleCellChange('scoliosis_rescreen', value) : undefined}
                                      type={isEditing ? 'select' : 'text'}
                                      options={isEditing ? TEST_RESULT_OPTIONS : []}
                                      className="text-sm text-center font-medium w-full"
                                      disabled={!isEditing}
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    Student not found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Student Tab Content */}
        {activeTab === 'add' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Student</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="First Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select Grade</option>
                    {GRADE_OPTIONS.filter(opt => opt.value).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStudent.school}
                    onChange={(e) => setNewStudent({ ...newStudent, school: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select School</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.name}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher Last Name
                  </label>
                  <input
                    type="text"
                    value={newStudent.teacher}
                    onChange={(e) => setNewStudent({ ...newStudent, teacher: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Teacher Last Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStudent.status}
                    onChange={(e) => setNewStudent({ ...newStudent, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="new">New</option>
                    <option value="returning">Returning</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Last Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newStudent.dob}
                    onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newStudent.unique_id}
                    onChange={(e) => setNewStudent({ ...newStudent, unique_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Student ID"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleAddStudent}
                disabled={createStudentMutation.isLoading}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStudentMutation.isLoading ? 'Creating...' : 'Create Student & Continue'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
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
        </div>
      )}
    </div>
  );
}
