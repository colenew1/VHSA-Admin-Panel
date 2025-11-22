import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, exportStickers, getStickerPreview, getReportingData, updateReportingData, exportReportingPDF, searchStudentsForExport, exportStudentsCSV } from '../api/client';
import EditableCell from '../components/EditableCell';

export default function Export() {
  const [activeTab, setActiveTab] = useState('sticker');
  
  // Year filter (shared across both tabs)
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  // Student Export tab state
  const [studentExportSchool, setStudentExportSchool] = useState('all');
  const [studentExportGrade, setStudentExportGrade] = useState('');
  const [studentExportStatus, setStudentExportStatus] = useState('all');
  const [studentExportSearch, setStudentExportSearch] = useState('');
  const [studentExportStartDate, setStudentExportStartDate] = useState('');
  const [studentExportEndDate, setStudentExportEndDate] = useState('');
  const [studentExportResults, setStudentExportResults] = useState(null);
  const [shouldSearchStudents, setShouldSearchStudents] = useState(false);
  const [isExportingStudents, setIsExportingStudents] = useState(false);
  
  // Sticker tab state
  const [selectedSchool, setSelectedSchool] = useState('');
  const [statusFilters, setStatusFilters] = useState({
    incomplete: false,
    completed: false,
    not_started: false,
    absent: false
  });
  const [stickerPreview, setStickerPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Reporting tab state
  const [reportSchool, setReportSchool] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [notes, setNotes] = useState('');
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Fetch schools
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });
  
  const schools = schoolsData?.schools || [];
  
  // Fetch reporting data
  const { data: reportingData, isLoading: loadingReporting } = useQuery({
    queryKey: ['reporting', reportSchool, startDate, endDate, year],
    queryFn: () => getReportingData({
      school: reportSchool,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      year: year || undefined,
    }),
    enabled: shouldFetch, // Only fetch when Generate Report is clicked
  });
  
  // Fetch student export data
  const { data: studentExportData, isLoading: loadingStudentExport } = useQuery({
    queryKey: ['studentExport', studentExportSchool, studentExportGrade, studentExportStatus, studentExportSearch, studentExportStartDate, studentExportEndDate, year],
    queryFn: () => searchStudentsForExport({
      school: studentExportSchool,
      grade: studentExportGrade || undefined,
      status: studentExportStatus,
      search: studentExportSearch || undefined,
      startDate: studentExportStartDate || undefined,
      endDate: studentExportEndDate || undefined,
      year: year || undefined,
    }),
    enabled: shouldSearchStudents, // Only fetch when Search is clicked
  });
  
  // Update results when data changes
  useEffect(() => {
    if (studentExportData) {
      setStudentExportResults(studentExportData);
    }
  }, [studentExportData]);
  
  // Store original data for cancel
  const [originalReportData, setOriginalReportData] = useState(null);
  
  // Update reportData when reportingData changes
  useEffect(() => {
    if (reportingData) {
      setReportData(reportingData);
      setOriginalReportData(JSON.parse(JSON.stringify(reportingData))); // Deep copy
    }
  }, [reportingData]);
  
  // Update reporting mutation
  const updateReportingMutation = useMutation({
    mutationFn: updateReportingData,
    onSuccess: () => {
      alert('Reporting data saved successfully!');
      setIsEditingReport(false);
      setShowSaveConfirm(false);
    },
    onError: (error) => {
      alert(`Error saving reporting data: ${error.response?.data?.error || error.message}`);
      setShowSaveConfirm(false);
    },
  });
  
  // Handle status filter toggle
  const handleStatusFilterToggle = (status) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };
  
  // Handle preview generation
  const handlePreviewStickers = async () => {
    if (!selectedSchool) {
      alert('Please select a school');
      return;
    }
    
    // Check if at least one status is selected
    const selectedStatuses = Object.entries(statusFilters)
      .filter(([_, selected]) => selected)
      .map(([status, _]) => status);
    
    if (selectedStatuses.length === 0) {
      alert('Please select at least one status filter');
      return;
    }
    
    setIsLoadingPreview(true);
    try {
      const data = await getStickerPreview({
        school: selectedSchool,
        status: selectedStatuses.join(','),
        year: year || undefined
      });
      setStickerPreview(data.stickers || []);
    } catch (error) {
      alert(`Error generating preview: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  // Handle sticker data edit
  const handleStickerCellChange = (index, field, value) => {
    if (!stickerPreview) return;
    
    const updated = [...stickerPreview];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setStickerPreview(updated);
  };
  
  // Handle sticker export
  const handleExportStickers = async () => {
    if (!selectedSchool) {
      alert('Please select a school');
      return;
    }
    
    if (!stickerPreview || stickerPreview.length === 0) {
      alert('Please generate a preview first');
      return;
    }
    
    setIsExporting(true);
    try {
      const selectedStatuses = Object.entries(statusFilters)
        .filter(([_, selected]) => selected)
        .map(([status, _]) => status);
      
      const blob = await exportStickers({
        school: selectedSchool,
        stickerData: stickerPreview,
        status: selectedStatuses.join(','),
        year: year || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stickers-${selectedSchool.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error exporting stickers: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle generate report
  const handleGenerateReport = () => {
    setShouldFetch(true);
    queryClient.invalidateQueries(['reporting', reportSchool, startDate, endDate, year]);
  };
  
  // Generate year options (last 6 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  
  // Handle cell change in reporting table
  const handleReportCellChange = (gradeIndex, field, subField, value) => {
    if (!reportData) return;
    
    const updated = { ...reportData };
    
    if (gradeIndex === -1) {
      // Summary row
      if (subField) {
        updated.summary[field][subField] = parseInt(value) || 0;
      } else {
        updated.summary[field] = parseInt(value) || 0;
      }
    } else {
      // Grade row
      if (subField) {
        updated.byGrade[gradeIndex][field][subField] = parseInt(value) || 0;
      } else {
        updated.byGrade[gradeIndex][field] = parseInt(value) || 0;
      }
    }
    
    setReportData(updated);
  };
  
  // Handle edit mode toggle
  const handleEditReport = () => {
    setIsEditingReport(true);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditingReport(false);
    // Reload original data to discard changes
    if (originalReportData) {
      setReportData(JSON.parse(JSON.stringify(originalReportData)));
    }
  };
  
  // Handle save reporting changes with confirmation
  const handleSaveReporting = () => {
    if (!reportData) return;
    setShowSaveConfirm(true);
  };
  
  // Confirm save
  const handleConfirmSave = () => {
    if (!reportData) return;
    updateReportingMutation.mutate(reportData);
    setIsEditingReport(false);
    setShowSaveConfirm(false);
  };
  
  // Handle student export search
  const handleSearchStudents = () => {
    setShouldSearchStudents(true);
    queryClient.invalidateQueries(['studentExport', studentExportSchool, studentExportGrade, studentExportStatus, studentExportSearch, studentExportStartDate, studentExportEndDate, year]);
  };
  
  // Handle export students as CSV
  const handleExportStudentsCSV = async () => {
    if (!studentExportResults || studentExportResults.count === 0) {
      alert('Please search for students first');
      return;
    }
    
    setIsExportingStudents(true);
    try {
      const blob = await exportStudentsCSV({
        school: studentExportSchool,
        grade: studentExportGrade || undefined,
        status: studentExportStatus,
        search: studentExportSearch || undefined,
        startDate: studentExportStartDate || undefined,
        endDate: studentExportEndDate || undefined,
        year: year || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const schoolName = studentExportSchool === 'all' ? 'All-Schools' : studentExportSchool.replace(/\s+/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `students-export-${schoolName}-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error exporting CSV: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsExportingStudents(false);
    }
  };
  
  // Handle export reporting as PDF
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const handleExportReportingPDF = async () => {
    if (!reportData) {
      alert('Please generate a report first');
      return;
    }
    
    setIsExportingPDF(true);
    try {
      const blob = await exportReportingPDF({
        reportData,
        school: reportSchool,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        year: year || undefined,
        notes: notes || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const schoolName = reportSchool === 'all' ? 'All-Schools' : reportSchool.replace(/\s+/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `reporting-${schoolName}-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error exporting PDF: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsExportingPDF(false);
    }
  };
  
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Export</h1>
      
      {/* Year Filter - Shared across both tabs */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Record Created Year
        </label>
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            // Clear preview/data when year changes
            setStickerPreview(null);
            setReportData(null);
            setShouldFetch(false);
          }}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {yearOptions.map(y => (
            <option key={y} value={y.toString()}>{y}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          Filter by the year the screening record was created in the database
        </p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('sticker')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sticker'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Sticker
          </button>
          <button
            onClick={() => setActiveTab('reporting')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reporting'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Reporting
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'students'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Students
          </button>
        </nav>
      </div>
      
      {/* Sticker Tab */}
      {activeTab === 'sticker' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Template: <strong>Avery 5161</strong> (20 labels per sheet, 1" x 4" labels)
            </p>
            <p className="text-sm text-blue-800">
              Each label contains: <strong>Student ID</strong>, <strong>Student Name</strong>, <strong>Grade</strong>, <strong>Tests Needed</strong>
            </p>
          </div>
          
          {/* Filters */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select School <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value);
                    setStickerPreview(null); // Clear preview when school changes
                  }}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">-- Select School --</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.name}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Filters
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={statusFilters.not_started}
                      onChange={() => handleStatusFilterToggle('not_started')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Not Started</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={statusFilters.absent}
                      onChange={() => handleStatusFilterToggle('absent')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Absent</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={statusFilters.incomplete}
                      onChange={() => handleStatusFilterToggle('incomplete')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Incomplete</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={statusFilters.completed}
                      onChange={() => handleStatusFilterToggle('completed')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Completed</span>
                  </label>
                </div>
              </div>
              
              <button
                onClick={handlePreviewStickers}
                disabled={!selectedSchool || isLoadingPreview}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingPreview ? 'Generating Preview...' : 'Preview Stickers'}
              </button>
            </div>
          </div>
          
          {/* Preview/Edit Table */}
          {stickerPreview && stickerPreview.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Preview & Edit ({stickerPreview.length} sticker{stickerPreview.length !== 1 ? 's' : ''})
                </h2>
                <button
                  onClick={handleExportStickers}
                  disabled={isExporting}
                  className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting PDF...' : 'Export PDF'}
                </button>
              </div>
              
              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">#</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Student ID</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Student Name</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Grade</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Tests Needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stickerPreview.map((sticker, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          <EditableCell
                            value={sticker.student_id || ''}
                            onChange={(value) => handleStickerCellChange(index, 'student_id', value)}
                            type="text"
                            className="text-sm w-full font-mono"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <EditableCell
                            value={sticker.student_name || ''}
                            onChange={(value) => handleStickerCellChange(index, 'student_name', value)}
                            type="text"
                            className="text-sm w-full"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <EditableCell
                            value={sticker.grade || ''}
                            onChange={(value) => handleStickerCellChange(index, 'grade', value)}
                            type="text"
                            className="text-sm w-full"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <EditableCell
                            value={sticker.tests_needed || ''}
                            onChange={(value) => handleStickerCellChange(index, 'tests_needed', value)}
                            type="text"
                            className="text-sm w-full font-mono"
                            placeholder="V H A S"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {stickerPreview && stickerPreview.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              No stickers match the selected filters.
            </div>
          )}
        </div>
      )}
      
      {/* Reporting Tab */}
      {activeTab === 'reporting' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School
                </label>
                <select
                  value={reportSchool}
                  onChange={(e) => setReportSchool(e.target.value)}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={handleGenerateReport}
                disabled={loadingReporting}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loadingReporting ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
            
            {/* Notes Section */}
            <div className="mt-6 border border-gray-300 rounded-lg">
              <button
                onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center rounded-t-lg"
              >
                <span className="font-medium text-gray-700">Notes</span>
                <span className="text-gray-500">{isNotesExpanded ? '▼' : '▶'}</span>
              </button>
              {isNotesExpanded && (
                <div className="p-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter notes here..."
                    className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md text-sm resize-y"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Reporting Table */}
          {reportData && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Reporting Statistics</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportReportingPDF}
                    disabled={isExportingPDF}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isExportingPDF ? 'Exporting PDF...' : 'Download PDF'}
                  </button>
                  {!isEditingReport ? (
                    <button
                      onClick={handleEditReport}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveReporting}
                        disabled={updateReportingMutation.isLoading}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                      >
                        {updateReportingMutation.isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Grade</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Total Students</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Vision</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Hearing</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Acanthosis</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Scoliosis</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Glasses/Contacts</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700"></th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700"></th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs">Screened / Failed</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs">Screened / Failed</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs">Screened / Failed</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs">Screened / Failed</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Summary Row */}
                    <tr className="bg-blue-50 font-semibold">
                      <td className="border border-gray-300 px-3 py-2">TOTAL</td>
                      <td className="border border-gray-300 px-3 py-2">
                        {isEditingReport ? (
                          <EditableCell
                            value={reportData.summary.totalStudents || 0}
                            onChange={(value) => handleReportCellChange(-1, 'totalStudents', null, value)}
                            type="number"
                            className="text-sm w-full font-semibold"
                          />
                        ) : (
                          <span className="text-sm font-semibold">{reportData.summary.totalStudents || 0}</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="flex gap-1">
                          {isEditingReport ? (
                            <EditableCell
                              value={reportData.summary.totalVision || 0}
                              onChange={(value) => handleReportCellChange(-1, 'totalVision', null, value)}
                              type="number"
                              className="text-sm w-16"
                            />
                          ) : (
                            <span className="text-sm">{reportData.summary.totalVision || 0}</span>
                          )}
                          <span>/</span>
                          <span className="text-gray-500">-</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="flex gap-1">
                          {isEditingReport ? (
                            <EditableCell
                              value={reportData.summary.totalHearing || 0}
                              onChange={(value) => handleReportCellChange(-1, 'totalHearing', null, value)}
                              type="number"
                              className="text-sm w-16"
                            />
                          ) : (
                            <span className="text-sm">{reportData.summary.totalHearing || 0}</span>
                          )}
                          <span>/</span>
                          <span className="text-gray-500">-</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="flex gap-1">
                          {isEditingReport ? (
                            <EditableCell
                              value={reportData.summary.totalAcanthosis || 0}
                              onChange={(value) => handleReportCellChange(-1, 'totalAcanthosis', null, value)}
                              type="number"
                              className="text-sm w-16"
                            />
                          ) : (
                            <span className="text-sm">{reportData.summary.totalAcanthosis || 0}</span>
                          )}
                          <span>/</span>
                          <span className="text-gray-500">-</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="flex gap-1">
                          {isEditingReport ? (
                            <EditableCell
                              value={reportData.summary.totalScoliosis || 0}
                              onChange={(value) => handleReportCellChange(-1, 'totalScoliosis', null, value)}
                              type="number"
                              className="text-sm w-16"
                            />
                          ) : (
                            <span className="text-sm">{reportData.summary.totalScoliosis || 0}</span>
                          )}
                          <span>/</span>
                          <span className="text-gray-500">-</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <span className="text-gray-500">-</span>
                      </td>
                    </tr>
                    
                    {/* Grade Rows */}
                    {reportData.byGrade.map((gradeData, index) => (
                      <tr key={gradeData.grade}>
                        <td className="border border-gray-300 px-3 py-2 font-medium">{gradeData.grade}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          {isEditingReport ? (
                            <EditableCell
                              value={gradeData.totalStudents || 0}
                              onChange={(value) => handleReportCellChange(index, 'totalStudents', null, value)}
                              type="number"
                              className="text-sm w-full"
                            />
                          ) : (
                            <span className="text-sm">{gradeData.totalStudents || 0}</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex gap-1 items-center">
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.vision.screened || 0}
                                onChange={(value) => handleReportCellChange(index, 'vision', 'screened', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.vision.screened || 0}</span>
                            )}
                            <span>/</span>
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.vision.failed || 0}
                                onChange={(value) => handleReportCellChange(index, 'vision', 'failed', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.vision.failed || 0}</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex gap-1 items-center">
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.hearing.screened || 0}
                                onChange={(value) => handleReportCellChange(index, 'hearing', 'screened', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.hearing.screened || 0}</span>
                            )}
                            <span>/</span>
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.hearing.failed || 0}
                                onChange={(value) => handleReportCellChange(index, 'hearing', 'failed', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.hearing.failed || 0}</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex gap-1 items-center">
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.acanthosis.screened || 0}
                                onChange={(value) => handleReportCellChange(index, 'acanthosis', 'screened', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.acanthosis.screened || 0}</span>
                            )}
                            <span>/</span>
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.acanthosis.failed || 0}
                                onChange={(value) => handleReportCellChange(index, 'acanthosis', 'failed', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.acanthosis.failed || 0}</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex gap-1 items-center">
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.scoliosis.screened || 0}
                                onChange={(value) => handleReportCellChange(index, 'scoliosis', 'screened', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.scoliosis.screened || 0}</span>
                            )}
                            <span>/</span>
                            {isEditingReport ? (
                              <EditableCell
                                value={gradeData.scoliosis.failed || 0}
                                onChange={(value) => handleReportCellChange(index, 'scoliosis', 'failed', value)}
                                type="number"
                                className="text-sm w-16"
                              />
                            ) : (
                              <span className="text-sm">{gradeData.scoliosis.failed || 0}</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          {isEditingReport ? (
                            <EditableCell
                              value={gradeData.glassesContacts || 0}
                              onChange={(value) => handleReportCellChange(index, 'glassesContacts', null, value)}
                              type="number"
                              className="text-sm w-full"
                            />
                          ) : (
                            <span className="text-sm">{gradeData.glassesContacts || 0}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {!reportData && shouldFetch && !loadingReporting && (
            <div className="text-center py-8 text-gray-600">
              No data available
            </div>
          )}
          
          {loadingReporting && (
            <div className="text-center py-8 text-gray-600">
              Generating report...
            </div>
          )}
        </div>
      )}
      
      {/* Students Export Tab */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Export Students - Comprehensive Data Export
            </p>
            <p className="text-sm text-blue-800">
              Search for students using filters below, then export all matching student data as CSV with complete screening information.
            </p>
          </div>
          
          {/* Filters */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School
                </label>
                <select
                  value={studentExportSchool}
                  onChange={(e) => {
                    setStudentExportSchool(e.target.value);
                    setStudentExportResults(null);
                    setShouldSearchStudents(false);
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade (Optional)
                </label>
                <input
                  type="text"
                  value={studentExportGrade}
                  onChange={(e) => {
                    setStudentExportGrade(e.target.value);
                    setStudentExportResults(null);
                    setShouldSearchStudents(false);
                  }}
                  placeholder="e.g., 5th, 6th or 5th,6th,7th"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={studentExportStatus}
                  onChange={(e) => {
                    setStudentExportStatus(e.target.value);
                    setStudentExportResults(null);
                    setShouldSearchStudents(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Returning">Returning</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search (Name or ID)
                </label>
                <input
                  type="text"
                  value={studentExportSearch}
                  onChange={(e) => {
                    setStudentExportSearch(e.target.value);
                    setStudentExportResults(null);
                    setShouldSearchStudents(false);
                  }}
                  placeholder="Search by name or student ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={studentExportStartDate}
                  onChange={(e) => {
                    setStudentExportStartDate(e.target.value);
                    setStudentExportResults(null);
                    setShouldSearchStudents(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={studentExportEndDate}
                  onChange={(e) => {
                    setStudentExportEndDate(e.target.value);
                    setStudentExportResults(null);
                    setShouldSearchStudents(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={handleSearchStudents}
                disabled={loadingStudentExport}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loadingStudentExport ? 'Searching...' : 'Search Students'}
              </button>
            </div>
          </div>
          
          {/* Results */}
          {studentExportResults && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Search Results ({studentExportResults.count} student{studentExportResults.count !== 1 ? 's' : ''})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportStudentsCSV}
                    disabled={isExportingStudents || studentExportResults.count === 0}
                    className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExportingStudents ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>
              
              {studentExportResults.count > 0 ? (
                <div className="bg-white border border-gray-300 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-4">
                    Found <strong>{studentExportResults.count}</strong> student{studentExportResults.count !== 1 ? 's' : ''} matching your search criteria.
                    {studentExportResults.count > 0 && (
                      <span className="block mt-2 text-blue-600 font-medium">
                        Would you like to export?
                      </span>
                    )}
                  </p>
                  
                  {/* Preview Table - Show first 10 rows */}
                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Student ID</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Name</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Grade</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">School</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Screening Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentExportResults.students.slice(0, 10).map((student, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-3 py-2">{student.unique_id || ''}</td>
                            <td className="border border-gray-300 px-3 py-2">{student.full_name || `${student.first_name} ${student.last_name}`.trim()}</td>
                            <td className="border border-gray-300 px-3 py-2">{student.grade || ''}</td>
                            <td className="border border-gray-300 px-3 py-2">{student.school || ''}</td>
                            <td className="border border-gray-300 px-3 py-2">{student.status || ''}</td>
                            <td className="border border-gray-300 px-3 py-2">{student.initial_screening_date || 'Not screened'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {studentExportResults.count > 10 && (
                    <p className="mt-2 text-sm text-gray-600 text-center">
                      Showing first 10 of {studentExportResults.count} students. Export CSV to see all data.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  No students found matching your search criteria.
                </div>
              )}
            </div>
          )}
          
          {!studentExportResults && shouldSearchStudents && !loadingStudentExport && (
            <div className="text-center py-8 text-gray-600">
              No data available
            </div>
          )}
          
          {loadingStudentExport && (
            <div className="text-center py-8 text-gray-600">
              Searching students...
            </div>
          )}
        </div>
      )}
      
      {/* Save Confirmation Dialog */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Save</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to save these changes?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={updateReportingMutation.isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {updateReportingMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
