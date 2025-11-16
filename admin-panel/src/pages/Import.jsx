import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSchools, createStudent, getNextStudentId, createSchool } from '../api/client';
import EditableCell from '../components/EditableCell';
import { normalizeGrade, normalizeGender, normalizeStatus, normalizeDate, normalizeSchoolName } from '../utils/dataNormalization';

// Grade options for dropdown - must match database format exactly
const GRADE_OPTIONS = [
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

export default function Import() {
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState([]);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // School validation dialog state
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);
  const [missingSchool, setMissingSchool] = useState('');
  const [schoolDialogResolve, setSchoolDialogResolve] = useState(null);

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

  // Download example CSV
  const downloadExampleCSV = () => {
    const headers = CSV_HEADERS.join(',');
    const exampleRow = 'John,Doe,5,M,2015-08-15,Example Elementary School,Smith,New';
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
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
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
    
    // Validate headers (case-insensitive, flexible matching)
    const expectedHeaders = CSV_HEADERS.map(h => h.toLowerCase());
    const actualHeaders = headers.map(h => h.toLowerCase());
    
    const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
      if (values.length === 0 || values.every(v => !v)) continue; // Skip empty rows
      
      const row = {};
      headers.forEach((header, index) => {
        const key = header.toLowerCase().replace(/\s+/g, '_');
        row[key] = values[index] || '';
      });
      
      // Map to database field names and normalize
      const normalizedRow = {
        first_name: (row.first_name || '').trim(),
        last_name: (row.last_name || '').trim(),
        grade: normalizeGrade(row.grade || ''),
        gender: normalizeGender(row.gender || ''),
        dob: normalizeDate(row.date_of_birth || row.dob || ''),
        school: normalizeSchoolName(row.school || '', schools),
        teacher: (row.teacher_last_name || row.teacher || '').trim(),
        status: normalizeStatus(row.status || 'New'),
        unique_id: '', // Will be auto-assigned
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

  // Show dialog for missing school and wait for user decision
  const promptForMissingSchool = (schoolName) => {
    return new Promise((resolve) => {
      setMissingSchool(schoolName);
      setShowSchoolDialog(true);
      setSchoolDialogResolve(() => resolve);
    });
  };

  // Handle school dialog response
  const handleSchoolDialogResponse = async (shouldAdd) => {
    setShowSchoolDialog(false);
    
    if (shouldAdd) {
      try {
        await createSchoolMutation.mutateAsync({ name: missingSchool, active: true });
        // Refresh schools list - the query will automatically refetch
        await queryClient.invalidateQueries(['schools']);
        if (schoolDialogResolve) {
          schoolDialogResolve(true);
        }
      } catch (error) {
        alert(`Failed to add school "${missingSchool}": ${error.response?.data?.error || error.message}`);
        if (schoolDialogResolve) {
          schoolDialogResolve(false);
        }
      }
    } else {
      if (schoolDialogResolve) {
        schoolDialogResolve(false);
      }
    }
    
    setSchoolDialogResolve(null);
  };

  // Auto-assign student IDs based on school
  const assignStudentIds = async (data) => {
    // Group by school
    const schoolGroups = {};
    data.forEach((row, index) => {
      if (!row.school) return;
      if (!schoolGroups[row.school]) {
        schoolGroups[row.school] = [];
      }
      schoolGroups[row.school].push({ row, index });
    });

    // Get next ID for each school and assign sequentially
    const updatedData = [...data];
    for (const [schoolName, rows] of Object.entries(schoolGroups)) {
      try {
        // Get starting number for this school
        const { nextId: firstId } = await getNextStudentId(schoolName);
        const abbreviation = firstId.match(/^[A-Z]{2}/)?.[0] || 'XX';
        const startNumber = parseInt(firstId.match(/\d+$/)?.[0] || '1');

        // Assign IDs sequentially
        rows.forEach(({ row, index }, i) => {
          const number = startNumber + i;
          updatedData[index].unique_id = `${abbreviation}${String(number).padStart(4, '0')}`;
        });
      } catch (error) {
        console.error(`Error getting next ID for ${schoolName}:`, error);
        // Fallback: use generated abbreviation
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
      alert('Please upload a CSV file');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      // Get fresh schools list for validation
      let currentSchools = schools;
      if (schools.length === 0) {
        const { data: schoolsData } = await queryClient.fetchQuery({
          queryKey: ['schools'],
          queryFn: getSchools,
        });
        currentSchools = schoolsData?.schools || [];
      }
      
      // Validate schools - check if all schools exist in database
      let missingSchools = validateSchools(parsed, currentSchools);
      
      // Process missing schools one at a time
      while (missingSchools.length > 0) {
        const schoolName = missingSchools[0];
        const shouldAdd = await promptForMissingSchool(schoolName);
        
        if (!shouldAdd) {
          alert(`Import cancelled. School "${schoolName}" must be added to the database first.`);
          return; // Stop import
        }
        
        // Refresh schools list after adding
        await queryClient.invalidateQueries(['schools']);
        const { data: updatedSchoolsData } = await queryClient.fetchQuery({
          queryKey: ['schools'],
          queryFn: getSchools,
        });
        currentSchools = updatedSchoolsData?.schools || [];
        
        // Re-validate to check if there are more missing schools
        missingSchools = validateSchools(parsed, currentSchools);
      }
      
      // Auto-assign student IDs
      const withIds = await assignStudentIds(parsed);
      
      setCsvData(withIds);
      setEditingRowIndex(null);
    } catch (error) {
      alert(`Error parsing CSV: ${error.message}`);
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
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle cell edit with normalization
  const handleCellChange = async (rowIndex, field, value) => {
    const updated = [...csvData];
    const row = updated[rowIndex];
    
    // Normalize the value based on field type
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
      // If school changed, regenerate student ID
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
    
    updated[rowIndex] = {
      ...row,
      [field]: normalizedValue,
    };
    
    setCsvData(updated);
  };

  // Handle import
  const handleImport = async () => {
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < csvData.length; i++) {
      const student = csvData[i];
      
      // Validate required fields
      if (!student.first_name || !student.last_name || !student.grade || 
          !student.gender || !student.dob || !student.school || !student.status) {
        errorCount++;
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      try {
        await createStudentMutation.mutateAsync(student);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Row ${i + 1}: ${error.response?.data?.error || error.message}`);
      }
    }

    setIsImporting(false);
    setShowSecondConfirm(false);
    
    if (errorCount === 0) {
      alert(`Successfully imported ${successCount} student(s)!`);
      setCsvData([]);
    } else {
      alert(`Import completed with errors:\n\nSuccess: ${successCount}\nErrors: ${errorCount}\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Import Students</h1>

      {/* Download Example CSV */}
      <div className="mb-6">
        <button
          onClick={downloadExampleCSV}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Download Example CSV
        </button>
        <p className="text-sm text-gray-600 mt-2">
          Download the template CSV file with all required columns. Fill it out and upload it here.
          <br />
          <span className="text-xs text-gray-500">
            Note: Student IDs are automatically assigned based on school (e.g., ST0001, ST0002). 
            Data is automatically normalized (e.g., "fifth" → "5", "male" → "M").
          </span>
        </p>
      </div>

      {/* File Upload Area */}
      {csvData.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          <div className="space-y-4">
            <div className="text-4xl">📄</div>
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your CSV file here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supported format: CSV (.csv)
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Select File
            </button>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Preview & Edit ({csvData.length} student{csvData.length !== 1 ? 's' : ''})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCsvData([]);
                  setEditingRowIndex(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFirstConfirm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Import Students
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">#</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Student ID</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">First Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Last Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Grade</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Gender</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">DOB</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">School</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Teacher Last Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, index) => (
                  <tr key={index} className={editingRowIndex === index ? 'bg-blue-50' : ''}>
                    <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 font-mono text-sm font-semibold text-blue-600">
                      {row.unique_id || 'Pending...'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.first_name || ''}
                        onChange={(value) => handleCellChange(index, 'first_name', value)}
                        type="text"
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.last_name || ''}
                        onChange={(value) => handleCellChange(index, 'last_name', value)}
                        type="text"
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.grade || ''}
                        onChange={(value) => handleCellChange(index, 'grade', value)}
                        type={editingRowIndex === index ? 'select' : 'text'}
                        options={editingRowIndex === index ? GRADE_OPTIONS : []}
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.gender || ''}
                        onChange={(value) => handleCellChange(index, 'gender', value)}
                        type={editingRowIndex === index ? 'select' : 'text'}
                        options={editingRowIndex === index ? [
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Other', label: 'Other' },
                        ] : []}
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.dob || ''}
                        onChange={(value) => handleCellChange(index, 'dob', value)}
                        type="date"
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.school || ''}
                        onChange={(value) => handleCellChange(index, 'school', value)}
                        type={editingRowIndex === index ? 'select' : 'text'}
                        options={editingRowIndex === index ? schools.map(s => ({ value: s.name, label: s.name })) : []}
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.teacher || ''}
                        onChange={(value) => handleCellChange(index, 'teacher', value)}
                        type="text"
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <EditableCell
                        value={row.status || 'New'}
                        onChange={(value) => handleCellChange(index, 'status', value)}
                        type={editingRowIndex === index ? 'select' : 'text'}
                        options={editingRowIndex === index ? [
                          { value: 'New', label: 'New' },
                          { value: 'Returning', label: 'Returning' },
                        ] : []}
                        className="text-sm w-full"
                        disabled={editingRowIndex !== index}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {editingRowIndex === index ? (
                        <button
                          onClick={() => setEditingRowIndex(null)}
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Done
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingRowIndex(index)}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* First Confirmation Dialog */}
      {showFirstConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Import</h3>
            <p className="text-gray-700 mb-6">
              Do you want to import {csvData.length} student{csvData.length !== 1 ? 's' : ''}? 
              Please review all data before proceeding.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowFirstConfirm(false)}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowFirstConfirm(false);
                  setShowSecondConfirm(true);
                }}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Confirmation Dialog */}
      {showSecondConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Confirmation</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to import {csvData.length} student{csvData.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSecondConfirm(false)}
                disabled={isImporting}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Yes, Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School Validation Dialog */}
      {showSchoolDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">School Not Found</h3>
            <p className="text-gray-700 mb-6">
              The school "<strong>{missingSchool}</strong>" is not in the database. 
              Would you like to add it?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleSchoolDialogResponse(false)}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSchoolDialogResponse(true)}
                disabled={createSchoolMutation.isLoading}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {createSchoolMutation.isLoading ? 'Adding...' : 'Add to Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
