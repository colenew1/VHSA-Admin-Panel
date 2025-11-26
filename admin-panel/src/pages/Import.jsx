import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSchools, createStudent, getNextStudentId, createSchool } from '../api/client';
import EditableCell from '../components/EditableCell';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { normalizeGrade, normalizeGender, normalizeStatus, normalizeDate, normalizeSchoolName } from '../utils/dataNormalization';
import { GRADE_OPTIONS_NO_EMPTY } from '../constants/screeningOptions';

// CSV column headers matching Add Student form (Student ID is auto-assigned, not in CSV)
const CSV_HEADERS = [
  'First Name',
  'Last Name',
  'Grade',
  'Gender',
  'Date of Birth',
  'School',
  'Teacher Last Name',
  'Status',
];

// Required fields for validation
const REQUIRED_FIELDS = ['first_name', 'last_name', 'grade', 'gender', 'dob', 'school', 'status'];

export default function Import() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [csvData, setCsvData] = useState([]);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState(null); // { success: [], errors: [] }
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Track missing schools for warning
  const [missingSchools, setMissingSchools] = useState([]);

  // Fetch schools for dropdown
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });

  const schools = schoolsData?.schools || [];

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: createStudent,
  });

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      queryClient.invalidateQueries(['schools']);
    },
  });

  // Validate a single row
  const validateRow = (row) => {
    const errors = [];
    REQUIRED_FIELDS.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        errors.push(field);
      }
    });
    return errors;
  };

  // Get all validation errors for display
  const getValidationSummary = () => {
    let totalErrors = 0;
    const rowsWithErrors = [];
    
    csvData.forEach((row, index) => {
      const errors = validateRow(row);
      if (errors.length > 0) {
        totalErrors += errors.length;
        rowsWithErrors.push({ row: index + 1, errors });
      }
    });
    
    return { totalErrors, rowsWithErrors };
  };

  // Download example CSV
  const downloadExampleCSV = () => {
    const headers = CSV_HEADERS.join(',');
    const exampleRow = 'John,Doe,5th,Male,2015-08-15,Example Elementary,Smith,New';
    const csvContent = `${headers}\n${exampleRow}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV line handling quoted fields
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    
    const expectedHeaders = CSV_HEADERS.map(h => h.toLowerCase());
    const actualHeaders = headers.map(h => h.toLowerCase());
    
    const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
      if (values.length === 0 || values.every(v => !v)) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        const key = header.toLowerCase().replace(/\s+/g, '_');
        row[key] = values[index] || '';
      });
      
      const normalizedRow = {
        first_name: (row.first_name || '').trim(),
        last_name: (row.last_name || '').trim(),
        grade: normalizeGrade(row.grade || ''),
        gender: normalizeGender(row.gender || ''),
        dob: normalizeDate(row.date_of_birth || row.dob || ''),
        school: normalizeSchoolName(row.school || '', schools),
        teacher: (row.teacher_last_name || row.teacher || '').trim(),
        status: normalizeStatus(row.status || 'New'),
        unique_id: '',
      };
      
      data.push(normalizedRow);
    }

    return data;
  };

  // Check for schools that don't exist in database
  const validateSchools = (data, schoolsList) => {
    const schoolNames = [...new Set(data.map(row => row.school).filter(Boolean))];
    const existingSchoolNames = schoolsList.map(s => s.name);
    const missingSchools = schoolNames.filter(school => !existingSchoolNames.includes(school));
    return missingSchools;
  };

  // Check for missing schools and update state
  const checkMissingSchools = () => {
    const missing = validateSchools(csvData, schools);
    setMissingSchools(missing);
    return missing.length > 0;
  };

  // Auto-assign student IDs based on school
  const assignStudentIds = async (data) => {
    const schoolGroups = {};
    data.forEach((row, index) => {
      if (!row.school) return;
      if (!schoolGroups[row.school]) {
        schoolGroups[row.school] = [];
      }
      schoolGroups[row.school].push({ row, index });
    });

    const updatedData = [...data];
    for (const [schoolName, rows] of Object.entries(schoolGroups)) {
      try {
        const { nextId: firstId } = await getNextStudentId(schoolName);
        const abbreviation = firstId.match(/^[A-Z]{2}/)?.[0] || 'XX';
        const startNumber = parseInt(firstId.match(/\d+$/)?.[0] || '1');

        rows.forEach(({ row, index }, i) => {
          const number = startNumber + i;
          updatedData[index].unique_id = `${abbreviation}${String(number).padStart(4, '0')}`;
        });
      } catch (error) {
        console.error(`Error getting next ID for ${schoolName}:`, error);
        const abbreviation = generateSchoolAbbreviation(schoolName);
        rows.forEach(({ row, index }, i) => {
          updatedData[index].unique_id = `${abbreviation}${String(i + 1).padStart(4, '0')}`;
        });
      }
    }

    return updatedData;
  };

  // Generate school abbreviation (fallback)
  const generateSchoolAbbreviation = (schoolName) => {
    if (!schoolName) return 'XX';
    const cleaned = schoolName
      .replace(/^(St\.|Saint|St)\s+/i, '')
      .replace(/\s+(Elementary|Middle|High|School|Academy|Acad)$/i, '')
      .trim();
    const words = cleaned.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return 'XX';
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.warning('Please upload a CSV file');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      const withIds = await assignStudentIds(parsed);
      
      setCsvData(withIds);
      setEditingRowIndex(null);
      setImportResults(null);
      toast.success(`Loaded ${withIds.length} student(s) from CSV`);
    } catch (error) {
      toast.error(`Error parsing CSV: ${error.message}`);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };

  // Handle cell edit with normalization
  const handleCellChange = async (rowIndex, field, value) => {
    const updated = [...csvData];
    const row = updated[rowIndex];
    
    let normalizedValue = value;
    if (field === 'grade') {
      normalizedValue = normalizeGrade(value);
    } else if (field === 'gender') {
      normalizedValue = normalizeGender(value);
    } else if (field === 'status') {
      normalizedValue = normalizeStatus(value);
    } else if (field === 'dob') {
      normalizedValue = normalizeDate(value);
    } else if (field === 'school') {
      normalizedValue = normalizeSchoolName(value, schools);
      if (normalizedValue !== row.school && normalizedValue) {
        try {
          const { nextId } = await getNextStudentId(normalizedValue);
          row.unique_id = nextId;
        } catch (error) {
          console.error('Error regenerating ID:', error);
          const abbreviation = generateSchoolAbbreviation(normalizedValue);
          row.unique_id = `${abbreviation}0001`;
        }
      }
    }
    
    updated[rowIndex] = { ...row, [field]: normalizedValue };
    setCsvData(updated);
  };

  // Delete a row
  const handleDeleteRow = (index) => {
    const updated = csvData.filter((_, i) => i !== index);
    setCsvData(updated);
    if (editingRowIndex === index) {
      setEditingRowIndex(null);
    } else if (editingRowIndex > index) {
      setEditingRowIndex(editingRowIndex - 1);
    }
    toast.info('Row removed');
  };

  // Handle import
  const handleImport = async () => {
    // Check for missing schools
    let currentSchools = schools;
    if (schools.length === 0) {
      const { data: schoolsData } = await queryClient.fetchQuery({
        queryKey: ['schools'],
        queryFn: getSchools,
      });
      currentSchools = schoolsData?.schools || [];
    }
    
    const missingSchoolsList = validateSchools(csvData, currentSchools);
    
    if (missingSchoolsList.length > 0) {
      toast.error('Add missing schools in the Advanced tab first.');
      setShowConfirmDialog(false);
      return;
    }
    
    // Start import
    setIsImporting(true);
    setImportProgress({ current: 0, total: csvData.length });
    
    const results = { success: [], errors: [] };

    for (let i = 0; i < csvData.length; i++) {
      setImportProgress({ current: i + 1, total: csvData.length });
      
      const student = csvData[i];
      const rowErrors = validateRow(student);
      
      if (rowErrors.length > 0) {
        results.errors.push({
          row: i + 1,
          name: `${student.first_name} ${student.last_name}`,
          error: `Missing: ${rowErrors.join(', ')}`
        });
        continue;
      }

      try {
        await createStudentMutation.mutateAsync(student);
        results.success.push({
          row: i + 1,
          name: `${student.first_name} ${student.last_name}`,
          id: student.unique_id
        });
      } catch (error) {
        results.errors.push({
          row: i + 1,
          name: `${student.first_name} ${student.last_name}`,
          error: error.response?.data?.error || error.message
        });
      }
    }

    setIsImporting(false);
    setShowConfirmDialog(false);
    setImportResults(results);
    
    if (results.errors.length === 0) {
      toast.success(`Successfully imported ${results.success.length} student(s)!`);
      setCsvData([]);
    } else if (results.success.length > 0) {
      toast.warning(`Imported ${results.success.length} of ${csvData.length}. ${results.errors.length} failed.`);
    } else {
      toast.error('Import failed. Check the error summary below.');
    }
  };

  const validationSummary = csvData.length > 0 ? getValidationSummary() : { totalErrors: 0, rowsWithErrors: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import Students</h1>
          <p className="text-sm text-gray-500">Upload a CSV file to bulk import students</p>
        </div>

        {/* Steps indicator */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${csvData.length === 0 ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${csvData.length === 0 ? 'bg-blue-100' : 'bg-green-100'}`}>
                {csvData.length === 0 ? '1' : '✓'}
              </div>
              <span className="text-sm font-medium">Download Template</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
            <div className={`flex items-center gap-2 ${csvData.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${csvData.length > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                2
              </div>
              <span className="text-sm font-medium">Upload & Review</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
            <div className={`flex items-center gap-2 ${importResults ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importResults ? 'bg-green-100' : 'bg-gray-100'}`}>
                {importResults ? '✓' : '3'}
              </div>
              <span className="text-sm font-medium">Import Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Download Template */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Step 1: Download Template</h2>
          <p className="text-sm text-gray-600 mb-4">
            Download the CSV template, fill it out with student data, then upload it below.
            Student IDs are auto-generated based on school.
          </p>
          <button
            onClick={downloadExampleCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV Template
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Data is auto-normalized (e.g., "fifth" → "5th", "m" → "Male")
          </p>
        </div>

        {/* Step 2: Upload Area */}
        {csvData.length === 0 && !importResults && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Step 2: Upload CSV</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-5xl mb-4">📄</div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your CSV file here, or click to browse
              </p>
              <p className="text-sm text-gray-500">Supported format: .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Preview/Edit Table */}
        {csvData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Step 2: Review & Edit
                </h2>
                <p className="text-sm text-gray-500">
                  {csvData.length} student{csvData.length !== 1 ? 's' : ''} loaded
                  {validationSummary.totalErrors > 0 && (
                    <span className="text-red-600 ml-2">
                      • {validationSummary.rowsWithErrors.length} row(s) with errors
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCsvData([]);
                    setEditingRowIndex(null);
                    setImportResults(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    checkMissingSchools();
                    setShowConfirmDialog(true);
                  }}
                  disabled={csvData.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Students
                </button>
              </div>
            </div>

            {/* Validation Warning */}
            {validationSummary.totalErrors > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ {validationSummary.rowsWithErrors.length} row(s) have missing required fields. 
                  Fix them before importing or they will be skipped.
                </p>
              </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 w-12">#</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">ID</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">First Name*</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Last Name*</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Grade*</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Gender*</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">DOB*</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">School*</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Teacher</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Status*</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, index) => {
                    const rowErrors = validateRow(row);
                    const hasErrors = rowErrors.length > 0;
                    const isEditing = editingRowIndex === index;
                    
                    return (
                      <tr 
                        key={index} 
                        className={`
                          ${isEditing ? 'bg-blue-50' : hasErrors ? 'bg-red-50' : 'hover:bg-gray-50'}
                          ${hasErrors ? 'border-l-4 border-l-red-500' : ''}
                        `}
                      >
                        <td className="border-b border-gray-200 px-3 py-2 text-gray-500">{index + 1}</td>
                        <td className="border-b border-gray-200 px-3 py-2 font-mono text-xs font-semibold text-blue-600">
                          {row.unique_id || '...'}
                        </td>
                        <td className={`border-b border-gray-200 px-3 py-2 ${rowErrors.includes('first_name') ? 'bg-red-100' : ''}`}>
                          <EditableCell
                            value={row.first_name || ''}
                            onChange={(value) => handleCellChange(index, 'first_name', value)}
                            type="text"
                            disabled={!isEditing}
                          />
                        </td>
                        <td className={`border-b border-gray-200 px-3 py-2 ${rowErrors.includes('last_name') ? 'bg-red-100' : ''}`}>
                          <EditableCell
                            value={row.last_name || ''}
                            onChange={(value) => handleCellChange(index, 'last_name', value)}
                            type="text"
                            disabled={!isEditing}
                          />
                        </td>
                        <td className={`border-b border-gray-200 px-3 py-2 ${rowErrors.includes('grade') ? 'bg-red-100' : ''}`}>
                          <EditableCell
                            value={row.grade || ''}
                            onChange={(value) => handleCellChange(index, 'grade', value)}
                            type={isEditing ? 'select' : 'text'}
                            options={isEditing ? GRADE_OPTIONS_NO_EMPTY : []}
                            disabled={!isEditing}
                          />
                        </td>
                        <td className={`border-b border-gray-200 px-3 py-2 ${rowErrors.includes('gender') ? 'bg-red-100' : ''}`}>
                          <EditableCell
                            value={row.gender || ''}
                            onChange={(value) => handleCellChange(index, 'gender', value)}
                            type={isEditing ? 'select' : 'text'}
                            options={isEditing ? [
                              { value: 'Male', label: 'Male' },
                              { value: 'Female', label: 'Female' },
                              { value: 'Other', label: 'Other' },
                            ] : []}
                            disabled={!isEditing}
                          />
                        </td>
                        <td className={`border-b border-gray-200 px-3 py-2 ${rowErrors.includes('dob') ? 'bg-red-100' : ''}`}>
                          <EditableCell
                            value={row.dob || ''}
                            onChange={(value) => handleCellChange(index, 'dob', value)}
                            type="date"
                            disabled={!isEditing}
                          />
                        </td>
                        <td className={`border-b border-gray-200 px-3 py-2 ${rowErrors.includes('school') ? 'bg-red-100' : ''}`}>
                          <EditableCell
                            value={row.school || ''}
                            onChange={(value) => handleCellChange(index, 'school', value)}
                            type={isEditing ? 'select' : 'text'}
                            options={isEditing ? schools.map(s => ({ value: s.name, label: s.name })) : []}
                            disabled={!isEditing}
                          />
                        </td>
                        <td className="border-b border-gray-200 px-3 py-2">
                          <EditableCell
                            value={row.teacher || ''}
                            onChange={(value) => handleCellChange(index, 'teacher', value)}
                            type="text"
                            disabled={!isEditing}
                          />
                        </td>
                        <td className={`border-b border-gray-200 px-3 py-2 ${rowErrors.includes('status') ? 'bg-red-100' : ''}`}>
                          <EditableCell
                            value={row.status || 'New'}
                            onChange={(value) => handleCellChange(index, 'status', value)}
                            type={isEditing ? 'select' : 'text'}
                            options={isEditing ? [
                              { value: 'New', label: 'New' },
                              { value: 'Returning', label: 'Returning' },
                            ] : []}
                            disabled={!isEditing}
                          />
                        </td>
                        <td className="border-b border-gray-200 px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <button
                                onClick={() => setEditingRowIndex(null)}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                Done
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingRowIndex(index)}
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRow(index)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                              title="Remove row"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Results Summary */}
        {importResults && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>
            
            {/* Success Summary */}
            {importResults.success.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{importResults.success.length} student(s) imported successfully</span>
                </div>
                <div className="bg-green-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {importResults.success.map((s, i) => (
                    <div key={i} className="text-sm text-green-800">
                      ✓ Row {s.row}: {s.name} ({s.id})
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Error Summary */}
            {importResults.errors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{importResults.errors.length} row(s) failed</span>
                </div>
                <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {importResults.errors.map((e, i) => (
                    <div key={i} className="text-sm text-red-800">
                      ✗ Row {e.row}: {e.name} - {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                setImportResults(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import More Students
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog with Progress */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={isImporting ? "Importing Students..." : "Confirm Import"}
        message={
          isImporting ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-center text-gray-700">
                Importing student {importProgress.current} of {importProgress.total}...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-700 mb-4">
                Import {csvData.length} student{csvData.length !== 1 ? 's' : ''}?
              </p>
              {validationSummary.totalErrors > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ {validationSummary.rowsWithErrors.length} row(s) have missing fields and will be skipped.
                  </p>
                </div>
              )}
              {missingSchools.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">
                    ❌ Schools not in database: {missingSchools.join(', ')}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Add these schools in the Advanced tab before importing.
                  </p>
                </div>
              )}
            </>
          )
        }
        onConfirm={handleImport}
        onCancel={() => {
          if (!isImporting) {
            setShowConfirmDialog(false);
            setMissingSchools([]);
          }
        }}
        confirmText={isImporting ? 'Importing...' : 'Import'}
        confirmButtonClass="bg-green-600 hover:bg-green-700"
        isLoading={isImporting || missingSchools.length > 0}
      />
    </div>
  );
}
