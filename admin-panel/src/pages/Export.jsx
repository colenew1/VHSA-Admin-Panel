import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSchools, getScreeningData } from '../api/client';
import { getRowStatus, formatDate } from '../utils/statusHelpers';
import { useToast } from '../components/Toast';

// All possible grades in order
const ALL_GRADES = [
  'Pre-K (3)', 'Pre-K (4)', 'Kindergarten', 
  '1st', '2nd', '3rd', '4th', '5th', 
  '6th', '7th', '8th', 
  '9th', '10th', '11th', '12th'
];

// Grade presets for quick selection
const GRADE_PRESETS = {
  'all': { label: 'All Grades', grades: ALL_GRADES },
  'elementary': { label: 'Elementary (Pre-K - 5th)', grades: ['Pre-K (3)', 'Pre-K (4)', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th'] },
  'middle': { label: 'Middle School (6th - 8th)', grades: ['6th', '7th', '8th'] },
  'high': { label: 'High School (9th - 12th)', grades: ['9th', '10th', '11th', '12th'] },
  'k-5': { label: 'K-5 Only', grades: ['Kindergarten', '1st', '2nd', '3rd', '4th', '5th'] },
  'k-8': { label: 'K-8', grades: ['Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'] },
};

// Calculate what tests a student needs based on grade/status/gender
function getTestsNeeded(student) {
  const { grade, status, gender } = student;
  const isNew = status === 'New';
  
  if (grade === 'Pre-K (3)') return '';
  if (grade === 'Pre-K (4)') return 'V H';
  if (grade === 'Kindergarten') return 'V H';
  if (grade === '1st') return 'V H A';
  if (grade === '2nd') return isNew ? 'V H A' : '';
  if (grade === '3rd') return 'V H A';
  if (grade === '4th') return isNew ? 'V H A' : '';
  if (grade === '5th') return gender === 'Female' ? 'V H A S' : 'V H A';
  if (grade === '6th') return isNew ? 'V H A' : '';
  if (grade === '7th') return gender === 'Female' ? 'V H A S' : 'V H A';
  if (grade === '8th') return isNew ? (gender === 'Male' ? 'V H A S' : 'V H A') : '';
  if (['9th', '10th', '11th', '12th'].includes(grade)) return isNew ? 'V H A' : '';
  
  return '';
}

function isFail(value) {
  if (!value) return false;
  const v = String(value).toUpperCase().trim();
  return v === 'F' || v === 'FAIL' || (v.startsWith('20/') && parseInt(v.split('/')[1]) > 40);
}

// Format vision value as "20/XX" - handles raw numbers and existing "20/XX" format
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

export default function Export() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('cards');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [school, setSchool] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Report-specific state
  const [reportNotes, setReportNotes] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([...ALL_GRADES]);
  const [gradePreset, setGradePreset] = useState('all');
  
  // Student export state
  const [exportGrades, setExportGrades] = useState([...ALL_GRADES]);
  const [exportGradePreset, setExportGradePreset] = useState('all');
  
  // Cards export state
  const [cardsGrades, setCardsGrades] = useState([...ALL_GRADES]);
  const [cardsGradePreset, setCardsGradePreset] = useState('all');
  const [cardsTeacher, setCardsTeacher] = useState('all');
  
  // Fetch schools
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });
  const schools = schoolsData?.schools || [];
  
  // Fetch screening data
  const { data: screeningData, isLoading, refetch } = useQuery({
    queryKey: ['export-screening', school, year],
    queryFn: () => getScreeningData({
      school: school,
      year: year,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      limit: 5000,
      offset: 0,
    }),
    enabled: school !== '',
    refetchOnWindowFocus: false,
  });
  
  const allStudents = screeningData?.data || [];
  
  // Get unique teachers from current data
  const teachers = useMemo(() => {
    const teacherSet = new Set();
    allStudents.forEach(s => {
      if (s.teacher) teacherSet.add(s.teacher);
    });
    return Array.from(teacherSet).sort();
  }, [allStudents]);
  
  // Filter students for cards - by status, grade, and teacher
  const filteredStudents = useMemo(() => {
    let filtered = allStudents;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => getRowStatus(s) === statusFilter);
    }
    
    // Filter by grade
    filtered = filtered.filter(s => cardsGrades.includes(s.grade));
    
    // Filter by teacher
    if (cardsTeacher !== 'all') {
      filtered = filtered.filter(s => s.teacher === cardsTeacher);
    }
    
    return filtered;
  }, [allStudents, statusFilter, cardsGrades, cardsTeacher]);
  
  // Calculate reporting statistics - includes ALL selected grades even if empty
  const reportStats = useMemo(() => {
    // Initialize stats for ALL selected grades
    const stats = {
      total: 0,
      byGrade: {}
    };
    
    // Pre-populate all selected grades with zeros
    selectedGrades.forEach(grade => {
      stats.byGrade[grade] = {
        grade,
        total: 0,
        vision: { screened: 0, passed: 0, failed: 0 },
        hearing: { screened: 0, passed: 0, failed: 0 },
        acanthosis: { screened: 0, passed: 0, failed: 0 },
        scoliosis: { screened: 0, passed: 0, failed: 0 },
        glasses: 0,
      };
    });
    
    // Fill in actual data
    allStudents.forEach(student => {
      const grade = student.grade || 'Unknown';
      
      // Skip if grade not in selected grades
      if (!selectedGrades.includes(grade)) return;
      
      const g = stats.byGrade[grade];
      if (!g) return;
      
      g.total++;
      stats.total++;
      
      // Vision
      if (student.vision_initial_right || student.vision_initial_left || student.vision_overall) {
        g.vision.screened++;
        if (isFail(student.vision_overall) || isFail(student.vision_initial_right) || isFail(student.vision_initial_left)) {
          g.vision.failed++;
        } else {
          g.vision.passed++;
        }
      }
      
      // Hearing
      const hasHearing = student.hearing_initial_right_1000 || student.hearing_initial_left_1000 || student.hearing_overall;
      if (hasHearing) {
        g.hearing.screened++;
        const hearingFail = isFail(student.hearing_overall) ||
          isFail(student.hearing_initial_right_1000) || isFail(student.hearing_initial_right_2000) || isFail(student.hearing_initial_right_4000) ||
          isFail(student.hearing_initial_left_1000) || isFail(student.hearing_initial_left_2000) || isFail(student.hearing_initial_left_4000);
        if (hearingFail) {
          g.hearing.failed++;
        } else {
          g.hearing.passed++;
        }
      }
      
      // Acanthosis
      if (student.acanthosis_initial || student.acanthosis_rescreen) {
        g.acanthosis.screened++;
        if (isFail(student.acanthosis_initial) || isFail(student.acanthosis_rescreen)) {
          g.acanthosis.failed++;
        } else {
          g.acanthosis.passed++;
        }
      }
      
      // Scoliosis
      if (student.scoliosis_initial || student.scoliosis_rescreen) {
        g.scoliosis.screened++;
        if (isFail(student.scoliosis_initial) || isFail(student.scoliosis_rescreen)) {
          g.scoliosis.failed++;
        } else {
          g.scoliosis.passed++;
        }
      }
      
      // Glasses
      if (student.glasses_or_contacts === 'Yes') {
        g.glasses++;
      }
    });
    
    // Sort by grade order and convert to array
    const sortedGrades = selectedGrades.map(grade => stats.byGrade[grade]).filter(Boolean);
    
    return { ...stats, byGrade: sortedGrades };
  }, [allStudents, selectedGrades]);
  
  // Handle grade preset change
  const handlePresetChange = (preset) => {
    setGradePreset(preset);
    setSelectedGrades([...GRADE_PRESETS[preset].grades]);
  };
  
  // Toggle individual grade
  const toggleGrade = (grade) => {
    setGradePreset('custom');
    setSelectedGrades(prev => 
      prev.includes(grade) 
        ? prev.filter(g => g !== grade)
        : [...prev, grade].sort((a, b) => ALL_GRADES.indexOf(a) - ALL_GRADES.indexOf(b))
    );
  };
  
  // Generate student cards PDF (8 per page)
  const generateCardsPDF = () => {
    if (filteredStudents.length === 0) {
      toast.warning('No students to generate cards for');
      return;
    }
    
    const cardsHTML = filteredStudents.map((student) => {
      const tests = getTestsNeeded(student);
      return `
        <div class="card">
          <div class="card-header">
            <span class="student-id">${student.unique_id || 'N/A'}</span>
            <span class="grade">${student.grade || ''}</span>
          </div>
          <div class="student-name">${student.last_name}, ${student.first_name}</div>
          <div class="teacher">Teacher: ${student.teacher || '—'}</div>
          <div class="tests-section">
            <div class="tests-label">Tests Needed:</div>
            <div class="tests-boxes">
              ${tests.includes('V') ? '<div class="test-box">V<br><small>Vision</small></div>' : ''}
              ${tests.includes('H') ? '<div class="test-box">H<br><small>Hearing</small></div>' : ''}
              ${tests.includes('A') ? '<div class="test-box">A<br><small>AN</small></div>' : ''}
              ${tests.includes('S') ? '<div class="test-box">S<br><small>Spine</small></div>' : ''}
              ${!tests ? '<div class="no-tests">No tests required</div>' : ''}
            </div>
          </div>
          <div class="footer">VHSA Health Screening ${year}</div>
        </div>
      `;
    }).join('');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Cards - ${school === 'all' ? 'All Schools' : school}</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; }
          .cards-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 0.25in;
            height: 10in;
            page-break-after: always;
          }
          .cards-container:last-child { page-break-after: auto; }
          .card {
            border: 2px solid #333;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            height: 2.25in;
            background: white;
          }
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .student-id { font-family: monospace; font-weight: bold; font-size: 14px; }
          .grade { font-size: 12px; color: #666; }
          .student-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
          .teacher { font-size: 11px; color: #666; margin-bottom: 8px; }
          .tests-section { flex: 1; }
          .tests-label { font-size: 10px; font-weight: bold; color: #333; margin-bottom: 4px; }
          .tests-boxes { display: flex; gap: 8px; }
          .test-box {
            width: 45px;
            height: 45px;
            border: 2px solid #333;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
          }
          .test-box small { font-size: 8px; font-weight: normal; }
          .no-tests { font-size: 11px; color: #666; font-style: italic; }
          .footer { font-size: 9px; color: #999; text-align: right; margin-top: auto; }
        </style>
      </head>
      <body>
        ${(() => {
          const pages = [];
          for (let i = 0; i < filteredStudents.length; i += 8) {
            const pageStudents = filteredStudents.slice(i, i + 8);
            const pageCardsHTML = pageStudents.map(student => {
              const tests = getTestsNeeded(student);
              return `
                <div class="card">
                  <div class="card-header">
                    <span class="student-id">${student.unique_id || 'N/A'}</span>
                    <span class="grade">${student.grade || ''}</span>
                  </div>
                  <div class="student-name">${student.last_name}, ${student.first_name}</div>
                  <div class="teacher">Teacher: ${student.teacher || '—'}</div>
                  <div class="tests-section">
                    <div class="tests-label">Tests Needed:</div>
                    <div class="tests-boxes">
                      ${tests.includes('V') ? '<div class="test-box">V<br><small>Vision</small></div>' : ''}
                      ${tests.includes('H') ? '<div class="test-box">H<br><small>Hearing</small></div>' : ''}
                      ${tests.includes('A') ? '<div class="test-box">A<br><small>AN</small></div>' : ''}
                      ${tests.includes('S') ? '<div class="test-box">S<br><small>Spine</small></div>' : ''}
                      ${!tests ? '<div class="no-tests">No tests required</div>' : ''}
                    </div>
                  </div>
                  <div class="footer">VHSA Health Screening ${year}</div>
                </div>
              `;
            }).join('');
            pages.push(`<div class="cards-container">${pageCardsHTML}</div>`);
          }
          return pages.join('');
        })()}
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Filter students for export based on selected grades
  const exportFilteredStudents = useMemo(() => {
    return allStudents.filter(s => exportGrades.includes(s.grade));
  }, [allStudents, exportGrades]);
  
  // Export students as CSV
  const exportStudentsCSV = () => {
    if (exportFilteredStudents.length === 0) {
      toast.warning('No students to export');
      return;
    }
    
    const headers = [
      'Student ID', 'First Name', 'Last Name', 'Grade', 'Gender', 'DOB', 
      'School', 'Teacher', 'Screening Date', 'Status',
      'Vision Right', 'Vision Left', 'Glasses',
      'Hearing 1k R', 'Hearing 2k R', 'Hearing 4k R', 'Hearing 1k L', 'Hearing 2k L', 'Hearing 4k L',
      'Acanthosis', 'Scoliosis', 'Notes'
    ];
    
    const rows = exportFilteredStudents.map(s => [
      s.unique_id || '',
      s.first_name || '',
      s.last_name || '',
      s.grade || '',
      s.gender || '',
      s.dob ? formatDate(s.dob) : '',
      s.school || '',
      s.teacher || '',
      s.initial_screening_date ? formatDate(s.initial_screening_date) : '',
      getRowStatus(s),
      formatVision(s.vision_initial_right),
      formatVision(s.vision_initial_left),
      s.glasses_or_contacts || '',
      s.hearing_initial_right_1000 || '',
      s.hearing_initial_right_2000 || '',
      s.hearing_initial_right_4000 || '',
      s.hearing_initial_left_1000 || '',
      s.hearing_initial_left_2000 || '',
      s.hearing_initial_left_4000 || '',
      s.acanthosis_initial || '',
      s.scoliosis_initial || '',
      (s.notes || '').replace(/[\n\r,]/g, ' ')
    ]);
    
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${school === 'all' ? 'all-schools' : school.replace(/\s+/g, '-')}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };
  
  // Generate report PDF
  const generateReportPDF = () => {
    if (reportStats.total === 0 && !reportNotes.trim()) {
      toast.warning('No data to generate report');
      return;
    }
    
    const schoolName = school === 'all' ? 'All Schools' : school;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Screening Report - ${schoolName}</title>
        <style>
          @page { size: letter; margin: 0.75in; }
          body { font-family: Arial, sans-serif; font-size: 11px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          .meta { color: #666; margin-bottom: 15px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
          th { background: #f0f0f0; font-weight: bold; font-size: 10px; }
          .grade-col { text-align: left; font-weight: bold; }
          .total-row { background: #e8f4ff; font-weight: bold; }
          .section-header { background: #333; color: white; }
          .sub-header { background: #f5f5f5; font-size: 9px; }
          .notes-section { margin-top: 20px; page-break-inside: avoid; }
          .notes-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; }
          .notes-content { 
            border: 1px solid #ccc; 
            padding: 10px; 
            min-height: 100px; 
            white-space: pre-wrap;
            font-size: 10px;
            background: #fafafa;
          }
          .empty-row { color: #999; }
        </style>
      </head>
      <body>
        <h1>Vision, Hearing, Spinal & Acanthosis Screening Report</h1>
        <div class="meta">
          <strong>School:</strong> ${schoolName} &nbsp;|&nbsp;
          <strong>Year:</strong> ${year} &nbsp;|&nbsp;
          <strong>Generated:</strong> ${new Date().toLocaleDateString()}
        </div>
        
        <table>
          <thead>
            <tr class="section-header">
              <th>Grade</th>
              <th>Total</th>
              <th colspan="2">Vision</th>
              <th>Glasses</th>
              <th colspan="2">Hearing</th>
              <th colspan="2">Acanthosis</th>
              <th colspan="2">Scoliosis</th>
            </tr>
            <tr class="sub-header">
              <th></th>
              <th>Students</th>
              <th>Screened</th>
              <th>Failed</th>
              <th></th>
              <th>Screened</th>
              <th>Failed</th>
              <th>Screened</th>
              <th>Failed</th>
              <th>Screened</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            ${reportStats.byGrade.map(g => `
              <tr class="${g.total === 0 ? 'empty-row' : ''}">
                <td class="grade-col">${g.grade}</td>
                <td>${g.total}</td>
                <td>${g.vision.screened}</td>
                <td>${g.vision.failed || ''}</td>
                <td>${g.glasses}</td>
                <td>${g.hearing.screened}</td>
                <td>${g.hearing.failed || ''}</td>
                <td>${g.acanthosis.screened}</td>
                <td>${g.acanthosis.failed || ''}</td>
                <td>${g.scoliosis.screened}</td>
                <td>${g.scoliosis.failed || ''}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td class="grade-col">TOTAL</td>
              <td>${reportStats.total}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.vision.screened, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.vision.failed, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.glasses, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.hearing.screened, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.hearing.failed, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.acanthosis.screened, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.acanthosis.failed, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.scoliosis.screened, 0)}</td>
              <td>${reportStats.byGrade.reduce((s, g) => s + g.scoliosis.failed, 0)}</td>
            </tr>
          </tbody>
        </table>
        
        ${reportNotes.trim() ? `
          <div class="notes-section">
            <div class="notes-title">Notes:</div>
            <div class="notes-content">${reportNotes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
        ` : ''}
        
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Export</h1>
          <p className="text-sm text-gray-500">Generate student cards, reports, and data exports</p>
        </div>
        
        {/* Global Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 block mb-1">School</label>
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          {isLoading && <p className="text-sm text-gray-500 mt-2">Loading data...</p>}
          {!isLoading && allStudents.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-medium text-gray-900">{allStudents.length}</span> students loaded
            </p>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏷️ Student Cards
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'report' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 School Report
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Student Data
          </button>
        </div>
        
        {/* Student Cards Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Student Cards</h2>
              <p className="text-sm text-gray-600 mb-4">
                Print cards for students to carry during screening. <strong>8 cards per page</strong> - designed to be cut with a paper cutter.
              </p>
              
              {/* Grade Filter */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 block mb-2">Filter by Grade</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(GRADE_PRESETS).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCardsGradePreset(key);
                        setCardsGrades([...GRADE_PRESETS[key].grades]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        cardsGradePreset === key
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADES.map(grade => (
                    <label key={grade} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cardsGrades.includes(grade)}
                        onChange={(e) => {
                          setCardsGradePreset('');
                          if (e.target.checked) {
                            setCardsGrades(prev => [...prev, grade].sort((a, b) => ALL_GRADES.indexOf(a) - ALL_GRADES.indexOf(b)));
                          } else {
                            setCardsGrades(prev => prev.filter(g => g !== grade));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{grade}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Teacher Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Filter by Teacher</label>
                <select
                  value={cardsTeacher}
                  onChange={(e) => setCardsTeacher(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                >
                  <option value="all">All Teachers ({teachers.length})</option>
                  {teachers.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Filter by Status</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All', count: allStudents.filter(s => cardsGrades.includes(s.grade) && (cardsTeacher === 'all' || s.teacher === cardsTeacher)).length },
                    { value: 'not_started', label: 'Not Started', count: allStudents.filter(s => cardsGrades.includes(s.grade) && (cardsTeacher === 'all' || s.teacher === cardsTeacher) && getRowStatus(s) === 'not_started').length },
                    { value: 'incomplete', label: 'Incomplete', count: allStudents.filter(s => cardsGrades.includes(s.grade) && (cardsTeacher === 'all' || s.teacher === cardsTeacher) && getRowStatus(s) === 'incomplete').length },
                    { value: 'completed', label: 'Completed', count: allStudents.filter(s => cardsGrades.includes(s.grade) && (cardsTeacher === 'all' || s.teacher === cardsTeacher) && getRowStatus(s) === 'completed').length },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === opt.value
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {opt.label} ({opt.count})
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{filteredStudents.length}</span> cards will be generated
                    ({Math.ceil(filteredStudents.length / 8)} page{Math.ceil(filteredStudents.length / 8) !== 1 ? 's' : ''})
                  </p>
                </div>
                <button
                  onClick={generateCardsPDF}
                  disabled={filteredStudents.length === 0 || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Cards
                </button>
              </div>
              
              {/* Preview */}
              {filteredStudents.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Preview (first 4 cards)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredStudents.slice(0, 4).map((student, idx) => {
                      const tests = getTestsNeeded(student);
                      return (
                        <div key={idx} className="border-2 border-gray-300 rounded-lg p-3 bg-white">
                          <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-2">
                            <span className="font-mono font-bold text-sm">{student.unique_id || 'N/A'}</span>
                            <span className="text-xs text-gray-500">{student.grade}</span>
                          </div>
                          <p className="font-semibold">{student.last_name}, {student.first_name}</p>
                          <p className="text-xs text-gray-500 mb-2">Teacher: {student.teacher || '—'}</p>
                          <div className="flex gap-2">
                            {tests.split(' ').filter(Boolean).map(t => (
                              <div key={t} className="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center text-xs font-bold">
                                {t}
                              </div>
                            ))}
                            {!tests && <span className="text-xs text-gray-400 italic">No tests required</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* School Report Tab */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">School Screening Report</h2>
                  <p className="text-sm text-gray-600">
                    Summary statistics by grade with notes
                  </p>
                </div>
                <button
                  onClick={generateReportPDF}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
              
              {/* Grade Selection */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 block mb-2">Select Grades to Include</label>
                
                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(GRADE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetChange(key)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        gradePreset === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {gradePreset === 'custom' && (
                    <span className="px-3 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      Custom Selection
                    </span>
                  )}
                </div>
                
                {/* Individual Grade Checkboxes */}
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADES.map(grade => (
                    <label
                      key={grade}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-all ${
                        selectedGrades.includes(grade)
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGrades.includes(grade)}
                        onChange={() => toggleGrade(grade)}
                        className="w-3 h-3"
                      />
                      {grade}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Report Table */}
              {selectedGrades.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Select at least one grade to show the report
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-3 py-2 text-left">Grade</th>
                        <th className="px-3 py-2 text-center">Total</th>
                        <th className="px-3 py-2 text-center" colSpan={2}>Vision</th>
                        <th className="px-3 py-2 text-center">👓</th>
                        <th className="px-3 py-2 text-center" colSpan={2}>Hearing</th>
                        <th className="px-3 py-2 text-center" colSpan={2}>AN</th>
                        <th className="px-3 py-2 text-center" colSpan={2}>Scoliosis</th>
                      </tr>
                      <tr className="bg-gray-100 text-xs text-gray-600">
                        <th></th>
                        <th></th>
                        <th className="px-2 py-1">Done</th>
                        <th className="px-2 py-1">Fail</th>
                        <th></th>
                        <th className="px-2 py-1">Done</th>
                        <th className="px-2 py-1">Fail</th>
                        <th className="px-2 py-1">Done</th>
                        <th className="px-2 py-1">Fail</th>
                        <th className="px-2 py-1">Done</th>
                        <th className="px-2 py-1">Fail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportStats.byGrade.map((g, idx) => (
                        <tr key={g.grade} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${g.total === 0 ? 'text-gray-400' : ''}`}>
                          <td className="px-3 py-2 font-medium">{g.grade}</td>
                          <td className="px-3 py-2 text-center">{g.total || '—'}</td>
                          <td className="px-3 py-2 text-center">{g.vision.screened || '—'}</td>
                          <td className={`px-3 py-2 text-center ${g.vision.failed > 0 ? 'text-red-600 font-bold' : ''}`}>{g.vision.failed || '—'}</td>
                          <td className="px-3 py-2 text-center">{g.glasses || '—'}</td>
                          <td className="px-3 py-2 text-center">{g.hearing.screened || '—'}</td>
                          <td className={`px-3 py-2 text-center ${g.hearing.failed > 0 ? 'text-red-600 font-bold' : ''}`}>{g.hearing.failed || '—'}</td>
                          <td className="px-3 py-2 text-center">{g.acanthosis.screened || '—'}</td>
                          <td className={`px-3 py-2 text-center ${g.acanthosis.failed > 0 ? 'text-red-600 font-bold' : ''}`}>{g.acanthosis.failed || '—'}</td>
                          <td className="px-3 py-2 text-center">{g.scoliosis.screened || '—'}</td>
                          <td className={`px-3 py-2 text-center ${g.scoliosis.failed > 0 ? 'text-red-600 font-bold' : ''}`}>{g.scoliosis.failed || '—'}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                        <td className="px-3 py-2">TOTAL</td>
                        <td className="px-3 py-2 text-center">{reportStats.total}</td>
                        <td className="px-3 py-2 text-center">{reportStats.byGrade.reduce((s, g) => s + g.vision.screened, 0)}</td>
                        <td className="px-3 py-2 text-center text-red-600">{reportStats.byGrade.reduce((s, g) => s + g.vision.failed, 0)}</td>
                        <td className="px-3 py-2 text-center">{reportStats.byGrade.reduce((s, g) => s + g.glasses, 0)}</td>
                        <td className="px-3 py-2 text-center">{reportStats.byGrade.reduce((s, g) => s + g.hearing.screened, 0)}</td>
                        <td className="px-3 py-2 text-center text-red-600">{reportStats.byGrade.reduce((s, g) => s + g.hearing.failed, 0)}</td>
                        <td className="px-3 py-2 text-center">{reportStats.byGrade.reduce((s, g) => s + g.acanthosis.screened, 0)}</td>
                        <td className="px-3 py-2 text-center text-red-600">{reportStats.byGrade.reduce((s, g) => s + g.acanthosis.failed, 0)}</td>
                        <td className="px-3 py-2 text-center">{reportStats.byGrade.reduce((s, g) => s + g.scoliosis.screened, 0)}</td>
                        <td className="px-3 py-2 text-center text-red-600">{reportStats.byGrade.reduce((s, g) => s + g.scoliosis.failed, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Notes Section */}
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Notes (will be included in printed report)
                </label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Add any notes here... (e.g., 'John Smith - has back brace, skip scoliosis screening')"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-32 resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use this section for special circumstances, equipment notes, absent students, etc.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Student Data Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Export Student Data</h2>
                  <p className="text-sm text-gray-600">
                    Download complete screening data as a CSV file
                  </p>
                </div>
                <button
                  onClick={exportStudentsCSV}
                  disabled={exportFilteredStudents.length === 0 || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV ({exportFilteredStudents.length})
                </button>
              </div>
              
              {/* Grade Filter */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 block mb-2">Filter by Grade</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(GRADE_PRESETS).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setExportGradePreset(key);
                        setExportGrades([...GRADE_PRESETS[key].grades]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        exportGradePreset === key
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADES.map(grade => (
                    <label key={grade} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportGrades.includes(grade)}
                        onChange={(e) => {
                          setExportGradePreset('');
                          if (e.target.checked) {
                            setExportGrades(prev => [...prev, grade].sort((a, b) => ALL_GRADES.indexOf(a) - ALL_GRADES.indexOf(b)));
                          } else {
                            setExportGrades(prev => prev.filter(g => g !== grade));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{grade}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {allStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No students found. Select a school and year above.</p>
                </div>
              ) : exportFilteredStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>No students match the selected grades. Try selecting more grades.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-semibold text-gray-900">{exportFilteredStudents.length}</span> of {allStudents.length} students will be exported with the following information:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {['Student ID', 'Name', 'Grade', 'Gender', 'DOB', 'School', 'Teacher', 'Screening Date', 'Vision Results (20/XX)', 'Hearing Results', 'Acanthosis', 'Scoliosis', 'Notes'].map(field => (
                      <div key={field} className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {field}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Preview (first 5 students)</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left">ID</th>
                            <th className="px-2 py-1.5 text-left">Name</th>
                            <th className="px-2 py-1.5 text-left">Grade</th>
                            <th className="px-2 py-1.5 text-left">School</th>
                            <th className="px-2 py-1.5 text-left">Vision R</th>
                            <th className="px-2 py-1.5 text-left">Vision L</th>
                            <th className="px-2 py-1.5 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exportFilteredStudents.slice(0, 5).map((s, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-2 py-1.5 font-mono">{s.unique_id}</td>
                              <td className="px-2 py-1.5">{s.last_name}, {s.first_name}</td>
                              <td className="px-2 py-1.5">{s.grade}</td>
                              <td className="px-2 py-1.5">{s.school}</td>
                              <td className="px-2 py-1.5">{formatVision(s.vision_initial_right) || '—'}</td>
                              <td className="px-2 py-1.5">{formatVision(s.vision_initial_left) || '—'}</td>
                              <td className="px-2 py-1.5 capitalize">{getRowStatus(s).replace('_', ' ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {exportFilteredStudents.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        ...and {exportFilteredStudents.length - 5} more students
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
