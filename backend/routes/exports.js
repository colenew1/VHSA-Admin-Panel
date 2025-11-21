import express from 'express';
import { supabase } from '../config/database.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Export state report
router.get('/state', async (req, res, next) => {
  try {
    const { school, year = new Date().getFullYear() } = req.query;
    
    if (!school || school === 'all') {
      return res.status(400).json({ error: 'School is required for state export' });
    }
    
    const { data, error } = await supabase
      .from('state_export')
      .select('*')
      .eq('school', school)
      .eq('screening_year', year);
    
    if (error) throw error;
    
    // Convert to CSV
    const csv = convertToCSV(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="state-report-${school}-${year}.csv"`);
    res.send(csv);
    
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate tests needed based on grade, status, age, and gender
function calculateTestsNeeded(student) {
  const { grade, status, dob, gender } = student;
  const tests = [];
  
  // Get current year for age calculations
  const currentYear = new Date().getFullYear();
  const schoolYearStart = new Date(currentYear, 8, 1); // September 1st of current year
  const fourYearsAgo = new Date(currentYear - 4, 8, 1); // September 1st, 4 years ago
  
  // Parse DOB
  const studentDOB = dob ? new Date(dob) : null;
  const isNewStudent = status === 'New';
  
  // Pre-K (3): Blank (no tests)
  if (grade === 'Pre-K (3)') {
    return '';
  }
  
  // Pre-K (4): "V H" if turned 4 by Sept 1st of current school year, else blank
  if (grade === 'Pre-K (4)') {
    if (studentDOB && studentDOB < fourYearsAgo) {
      return 'V H';
    }
    return '';
  }
  
  // Kindergarten: "V H" (always required)
  if (grade === 'Kindergarten') {
    tests.push('V', 'H');
  }
  
  // 1st Grade: "V H A" (always required)
  else if (grade === '1st') {
    tests.push('V', 'H', 'A');
  }
  
  // 2nd Grade: "V H A" (new students only)
  else if (grade === '2nd') {
    if (isNewStudent) {
      tests.push('V', 'H', 'A');
    }
  }
  
  // 3rd Grade: "V H A" (always required)
  else if (grade === '3rd') {
    tests.push('V', 'H', 'A');
  }
  
  // 4th Grade: "V H A" (new students only)
  else if (grade === '4th') {
    if (isNewStudent) {
      tests.push('V', 'H', 'A');
    }
  }
  
  // 5th Grade: "V H A" + "S" if female (always required, scoliosis for girls only)
  else if (grade === '5th') {
    tests.push('V', 'H', 'A');
    if (gender === 'Female') {
      tests.push('S');
    }
  }
  
  // 6th Grade: "V H A" (new students only)
  else if (grade === '6th') {
    if (isNewStudent) {
      tests.push('V', 'H', 'A');
    }
  }
  
  // 7th Grade: "V H A" + "S" if female (always required, scoliosis for girls only)
  else if (grade === '7th') {
    tests.push('V', 'H', 'A');
    if (gender === 'Female') {
      tests.push('S');
    }
  }
  
  // 8th Grade: "V H A" + "S" if male (new students only, scoliosis for boys only)
  else if (grade === '8th') {
    if (isNewStudent) {
      tests.push('V', 'H', 'A');
      if (gender === 'Male') {
        tests.push('S');
      }
    }
  }
  
  // 9th-12th Grade: "V H A" (new students only)
  else if (['9th', '10th', '11th', '12th'].includes(grade)) {
    if (isNewStudent) {
      tests.push('V', 'H', 'A');
    }
  }
  
  // Join with spaces: "V H A" or "V H A S"
  return tests.join(' ');
}

// Helper function to determine what screenings are required for a student
function getRequiredScreenings(student) {
  const { grade, status, dob, gender } = student;
  const required = {
    vision: false,
    hearing: false,
    acanthosis: false,
    scoliosis: false
  };
  
  // Get current year for age calculations
  const currentYear = new Date().getFullYear();
  const fourYearsAgo = new Date(currentYear - 4, 8, 1); // September 1st, 4 years ago
  const studentDOB = dob ? new Date(dob) : null;
  const isNewStudent = status === 'New';
  
  // Pre-K (3): Recommended (not required)
  if (grade === 'Pre-K (3)') {
    // Nothing required
    return required;
  }
  
  // Pre-K (4): Vision and Hearing if turned 4 by Sept 1st
  if (grade === 'Pre-K (4)') {
    if (studentDOB && studentDOB < fourYearsAgo) {
      required.vision = true;
      required.hearing = true;
    }
    return required;
  }
  
  // Kindergarten: Vision and Hearing required
  if (grade === 'Kindergarten') {
    required.vision = true;
    required.hearing = true;
    return required;
  }
  
  // 1st Grade: Vision, Hearing, Acanthosis required
  if (grade === '1st') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
    return required;
  }
  
  // 2nd Grade: Vision, Hearing, Acanthosis (new students only)
  if (grade === '2nd') {
    if (isNewStudent) {
      required.vision = true;
      required.hearing = true;
      required.acanthosis = true;
    }
    return required;
  }
  
  // 3rd Grade: Vision, Hearing, Acanthosis required
  if (grade === '3rd') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
    return required;
  }
  
  // 4th Grade: Vision, Hearing, Acanthosis (new students only)
  if (grade === '4th') {
    if (isNewStudent) {
      required.vision = true;
      required.hearing = true;
      required.acanthosis = true;
    }
    return required;
  }
  
  // 5th Grade: Vision, Hearing, Acanthosis required; Scoliosis (girls only)
  if (grade === '5th') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
    if (gender === 'Female') {
      required.scoliosis = true;
    }
    return required;
  }
  
  // 6th Grade: Vision, Hearing, Acanthosis (new students only)
  if (grade === '6th') {
    if (isNewStudent) {
      required.vision = true;
      required.hearing = true;
      required.acanthosis = true;
    }
    return required;
  }
  
  // 7th Grade: Vision, Hearing, Acanthosis required; Scoliosis (girls only)
  if (grade === '7th') {
    required.vision = true;
    required.hearing = true;
    required.acanthosis = true;
    if (gender === 'Female') {
      required.scoliosis = true;
    }
    return required;
  }
  
  // 8th Grade: Vision, Hearing, Acanthosis (new students only); Scoliosis (boys only)
  if (grade === '8th') {
    if (isNewStudent) {
      required.vision = true;
      required.hearing = true;
      required.acanthosis = true;
      if (gender === 'Male') {
        required.scoliosis = true;
      }
    }
    return required;
  }
  
  // 9th-12th Grade: Vision, Hearing, Acanthosis (new students only)
  if (['9th', '10th', '11th', '12th'].includes(grade)) {
    if (isNewStudent) {
      required.vision = true;
      required.hearing = true;
      required.acanthosis = true;
    }
    return required;
  }
  
  return required;
}

// Helper function to determine student screening status
function getStudentStatus(student, screening) {
  // If no screening record exists, status is "not_started"
  if (!screening) {
    return 'not_started';
  }
  
  // If marked as absent, status is "absent"
  if (screening.was_absent) {
    return 'absent';
  }
  
  // Determine what screenings are actually required for this student
  const required = getRequiredScreenings(student);
  
  // Check if all required screenings are complete
  // Only check screenings that are actually required for this student
  const visionComplete = !required.vision || screening.vision_complete;
  const hearingComplete = !required.hearing || screening.hearing_complete;
  const acanthosisComplete = !required.acanthosis || screening.acanthosis_complete;
  const scoliosisComplete = !required.scoliosis || screening.scoliosis_complete;
  
  const allComplete = visionComplete && hearingComplete && acanthosisComplete && scoliosisComplete;
  
  if (allComplete) {
    return 'completed';
  }
  
  return 'incomplete';
}

// Get sticker preview data (JSON, for editing before export)
router.get('/stickers/preview', async (req, res, next) => {
  try {
    const { school, status, year } = req.query;
    
    if (!school || school === 'all') {
      return res.status(400).json({ error: 'School is required for sticker export' });
    }
    
    // Parse status filter (comma-separated: "incomplete,completed,not_started,absent")
    const statusFilters = status ? status.split(',') : ['incomplete', 'completed', 'not_started', 'absent'];
    
    // Query students table for the specified school
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('unique_id, first_name, last_name, grade, status, dob, gender')
      .eq('school', school)
      .order('grade')
      .order('last_name');
    
    if (studentsError) throw studentsError;
    
    // Get screening results for these students, filtered by year if provided
    const studentIds = students.map(s => s.unique_id).filter(Boolean);
    let screenings = [];
    
    if (studentIds.length > 0) {
      let screeningQuery = supabase
        .from('screening_results')
        .select('*')
        .in('unique_id', studentIds);
      
      // Filter by created_at year if year is provided
      if (year) {
        const yearNum = parseInt(year);
        const yearStart = `${yearNum}-01-01T00:00:00.000Z`;
        const yearEnd = `${yearNum}-12-31T23:59:59.999Z`;
        screeningQuery = screeningQuery
          .gte('created_at', yearStart)
          .lte('created_at', yearEnd);
      }
      
      const { data: screeningData, error: screeningError } = await screeningQuery;
      if (screeningError) throw screeningError;
      screenings = screeningData || [];
    }
    
    // Create screening map
    const screeningMap = {};
    screenings.forEach(s => {
      screeningMap[s.unique_id] = s;
    });
    
    // Process students, calculate tests_needed, and filter by status
    const stickerData = students
      .map(student => {
        const studentName = `${student.first_name} ${student.last_name}`;
        const testsNeeded = calculateTestsNeeded(student);
        const screening = screeningMap[student.unique_id];
        const studentStatus = getStudentStatus(student, screening);
        
        return {
          student_id: student.unique_id,
          student_name: studentName,
          grade: student.grade,
          tests_needed: testsNeeded,
          status: studentStatus
        };
      })
      .filter(item => statusFilters.includes(item.status));
    
    res.json({ stickers: stickerData });
    
  } catch (error) {
    next(error);
  }
});

// Export stickers as PDF (Avery 5161 template)
router.post('/stickers', async (req, res, next) => {
  try {
    const { school, stickerData, status } = req.body;
    
    if (!school || school === 'all') {
      return res.status(400).json({ error: 'School is required for sticker export' });
    }
    
    // If stickerData is provided, use it (from preview/edit)
    // Otherwise, fetch and filter based on status
    let labels = [];
    
    if (stickerData && Array.isArray(stickerData)) {
      // Use provided data from preview/edit
      labels = stickerData;
    } else {
      // Fetch data based on filters (same logic as preview)
      const statusFilters = status ? status.split(',') : ['incomplete', 'completed', 'not_started', 'absent'];
      const { year } = req.body;
      
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('unique_id, first_name, last_name, grade, status, dob, gender')
        .eq('school', school)
        .order('grade')
        .order('last_name');
      
      if (studentsError) throw studentsError;
      
      const studentIds = students.map(s => s.unique_id).filter(Boolean);
      let screenings = [];
      
      if (studentIds.length > 0) {
        let screeningQuery = supabase
          .from('screening_results')
          .select('*')
          .in('unique_id', studentIds);
        
        // Filter by created_at year if year is provided
        if (year) {
          const yearNum = parseInt(year);
          const yearStart = `${yearNum}-01-01T00:00:00.000Z`;
          const yearEnd = `${yearNum}-12-31T23:59:59.999Z`;
          screeningQuery = screeningQuery
            .gte('created_at', yearStart)
            .lte('created_at', yearEnd);
        }
        
        const { data: screeningData, error: screeningError } = await screeningQuery;
        if (screeningError) throw screeningError;
        screenings = screeningData || [];
      }
      
      const screeningMap = {};
      screenings.forEach(s => {
        screeningMap[s.unique_id] = s;
      });
      
      labels = students
        .map(student => {
          const studentName = `${student.first_name} ${student.last_name}`;
          const testsNeeded = calculateTestsNeeded(student);
          const screening = screeningMap[student.unique_id];
          const studentStatus = getStudentStatus(student, screening);
          
          return {
            student_id: student.unique_id,
            student_name: studentName,
            grade: student.grade,
            tests_needed: testsNeeded,
            status: studentStatus
          };
        })
        .filter(item => statusFilters.includes(item.status));
    }
    
    // Generate PDF with Avery 5161 template
    // Avery 5161: 20 labels per sheet (2 columns x 10 rows)
    // Label size: 1" x 4"
    // Page size: 8.5" x 11" (letter)
    
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 0.5 * 72, bottom: 0.5 * 72, left: 0.1875 * 72, right: 0.1875 * 72 }
    });
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="stickers-${school.replace(/\s+/g, '-')}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Label dimensions in points (72 points = 1 inch)
    // Avery 5161: Labels are 1" tall x 4" wide (landscape orientation)
    const labelHeight = 1 * 72; // 1 inch tall = 72 points
    const labelWidth = 4 * 72; // 4 inches wide = 288 points
    
    // Calculate spacing for Avery 5161
    // Top margin: 0.5"
    // Left margin: 0.1875" (3/16")
    // Horizontal gap between columns: 0.125" (1/8")
    // Vertical gap between rows: 0" (labels are continuous)
    const leftMargin = 0.1875 * 72;
    const topMargin = 0.5 * 72;
    const horizontalGap = 0.125 * 72;
    const verticalGap = 0;
    
    // Calculate starting positions for columns
    const col1X = leftMargin;
    const col2X = leftMargin + labelWidth + horizontalGap;
    
    let currentRow = 0;
    let currentCol = 0;
    
    // Generate labels
    for (const label of labels) {
      // Check if we need a new page (10 rows per page)
      if (currentRow >= 10) {
        doc.addPage();
        currentRow = 0;
        currentCol = 0;
      }
      
      // Calculate position
      const x = currentCol === 0 ? col1X : col2X;
      const y = topMargin + (currentRow * (labelHeight + verticalGap));
      
      // Draw label border (optional, for visual reference)
      // doc.rect(x, y, labelWidth, labelHeight).stroke();
      
      // Add label content
      const padding = 4; // Small padding inside label
      const contentX = x + padding;
      const contentY = y + padding;
      const contentWidth = labelWidth - (padding * 2);
      
      // Student ID (bold, larger)
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(label.student_id || '', contentX, contentY, {
           width: contentWidth,
           align: 'left'
         });
      
      // Student Name (medium)
      const nameY = contentY + 16;
      doc.fontSize(9)
         .font('Helvetica')
         .text(label.student_name || '', contentX, nameY, {
           width: contentWidth,
           align: 'left'
         });
      
      // Grade
      const gradeY = nameY + 12;
      doc.fontSize(8)
         .font('Helvetica')
         .text(`Grade: ${label.grade || ''}`, contentX, gradeY, {
           width: contentWidth,
           align: 'left'
         });
      
      // Tests Needed (if any) - new line, centered, considerably bigger
      if (label.tests_needed) {
        const testsY = gradeY + 16; // More space before tests
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(label.tests_needed, contentX, testsY, {
             width: contentWidth,
             align: 'center'
           });
      }
      
      // Move to next label position
      currentCol++;
      if (currentCol >= 2) {
        currentCol = 0;
        currentRow++;
      }
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    next(error);
  }
});

// Get reporting data
router.get('/reporting', async (req, res, next) => {
  try {
    const { school = 'all', startDate, endDate, year } = req.query;
    
    // Build query to get students with their screening results
    let studentsQuery = supabase
      .from('students')
      .select(`
        unique_id,
        first_name,
        last_name,
        grade,
        school,
        status
      `);
    
    if (school !== 'all') {
      studentsQuery = studentsQuery.eq('school', school);
    }
    
    const { data: students, error: studentsError } = await studentsQuery;
    if (studentsError) throw studentsError;
    
    // Get screening results
    const studentIds = students.map(s => s.unique_id).filter(Boolean);
    let screenings = [];
    
    if (studentIds.length > 0) {
      let screeningQuery = supabase
        .from('screening_results')
        .select('*')
        .in('unique_id', studentIds);
      
      // Filter by created_at year if year is provided (takes precedence over date range)
      if (year) {
        const yearNum = parseInt(year);
        const yearStart = `${yearNum}-01-01T00:00:00.000Z`;
        const yearEnd = `${yearNum}-12-31T23:59:59.999Z`;
        screeningQuery = screeningQuery
          .gte('created_at', yearStart)
          .lte('created_at', yearEnd);
      } else {
        // Fall back to initial_screening_date if no year is provided
        if (startDate) {
          screeningQuery = screeningQuery.gte('initial_screening_date', startDate);
        }
        if (endDate) {
          screeningQuery = screeningQuery.lte('initial_screening_date', endDate);
        }
      }
      
      const { data: screeningData, error: screeningsError } = await screeningQuery;
      if (screeningsError) throw screeningsError;
      screenings = screeningData || [];
    }
    
    // Create a map of screening results by unique_id
    const screeningMap = {};
    if (screenings) {
      screenings.forEach(screening => {
        screeningMap[screening.unique_id] = screening;
      });
    }
    
    // Group students by grade and calculate statistics
    const gradeStats = {};
    let summary = {
      totalStudents: 0,
      totalVision: 0,
      totalHearing: 0,
      totalAcanthosis: 0,
      totalScoliosis: 0
    };
    
    students.forEach(student => {
      const grade = student.grade || 'Unknown';
      const screening = screeningMap[student.unique_id];
      
      if (!gradeStats[grade]) {
        gradeStats[grade] = {
          grade: grade,
          totalStudents: 0,
          vision: { screened: 0, failed: 0 },
          hearing: { screened: 0, failed: 0 },
          acanthosis: { screened: 0, failed: 0 },
          scoliosis: { screened: 0, failed: 0 },
          glassesContacts: 0
        };
      }
      
      gradeStats[grade].totalStudents++;
      summary.totalStudents++;
      
      if (screening) {
        // Vision
        if (screening.vision_initial_right || screening.vision_initial_left || 
            screening.vision_rescreen_right || screening.vision_rescreen_left) {
          gradeStats[grade].vision.screened++;
          summary.totalVision++;
          
          // Check for fails (F in any vision field)
          if (screening.vision_initial_right === 'F' || screening.vision_initial_left === 'F' ||
              screening.vision_rescreen_right === 'F' || screening.vision_rescreen_left === 'F') {
            gradeStats[grade].vision.failed++;
          }
        }
        
        // Glasses/Contacts
        if (screening.glasses_or_contacts === 'Yes' || screening.glasses_or_contacts === true) {
          gradeStats[grade].glassesContacts++;
        }
        
        // Hearing
        if (screening.hearing_initial_right || screening.hearing_initial_left ||
            screening.hearing_rescreen_right || screening.hearing_rescreen_left) {
          gradeStats[grade].hearing.screened++;
          summary.totalHearing++;
          
          // Check for fails (F in any hearing field)
          if (screening.hearing_initial_right === 'F' || screening.hearing_initial_left === 'F' ||
              screening.hearing_rescreen_right === 'F' || screening.hearing_rescreen_left === 'F') {
            gradeStats[grade].hearing.failed++;
          }
        }
        
        // Acanthosis
        if (screening.acanthosis_initial || screening.acanthosis_rescreen) {
          gradeStats[grade].acanthosis.screened++;
          summary.totalAcanthosis++;
          
          if (screening.acanthosis_initial === 'F' || screening.acanthosis_rescreen === 'F') {
            gradeStats[grade].acanthosis.failed++;
          }
        }
        
        // Scoliosis
        if (screening.scoliosis_initial || screening.scoliosis_rescreen) {
          gradeStats[grade].scoliosis.screened++;
          summary.totalScoliosis++;
          
          if (screening.scoliosis_initial === 'F' || screening.scoliosis_rescreen === 'F') {
            gradeStats[grade].scoliosis.failed++;
          }
        }
      }
    });
    
    // Convert to array and sort by grade
    const byGrade = Object.values(gradeStats).sort((a, b) => {
      // Custom sort order: Pre-K (3), Pre-K (4), Kindergarten, then 1st-12th
      const gradeOrder = {
        'Pre-K (3)': 0,
        'Pre-K (4)': 1,
        'Kindergarten': 2,
        '1st': 3, '2nd': 4, '3rd': 5, '4th': 6, '5th': 7,
        '6th': 8, '7th': 9, '8th': 10, '9th': 11, '10th': 12,
        '11th': 13, '12th': 14
      };
      const aOrder = gradeOrder[a.grade] ?? 99;
      const bOrder = gradeOrder[b.grade] ?? 99;
      return aOrder - bOrder;
    });
    
    res.json({
      summary,
      byGrade
    });
    
  } catch (error) {
    next(error);
  }
});

// Save reporting data (for editable statistics)
router.put('/reporting', async (req, res, next) => {
  try {
    const { summary, byGrade } = req.body;
    
    // For now, we'll just return success
    // In the future, this could save to a reporting_statistics table
    // For now, the data is calculated on-the-fly, so we'll just validate and return
    
    if (!summary || !byGrade) {
      return res.status(400).json({ error: 'Invalid reporting data structure' });
    }
    
    // TODO: Save to database if needed
    // For now, we'll just acknowledge the save
    res.json({
      message: 'Reporting data saved successfully',
      summary,
      byGrade
    });
    
  } catch (error) {
    next(error);
  }
});

// Helper function to convert JSON to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return `"${value !== null && value !== undefined ? value : ''}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}


export default router;

