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
          status: studentStatus,
          student_status: student.status || 'Returning' // "New" or "Returning"
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
            status: studentStatus,
            student_status: student.status || 'Returning' // "New" or "Returning"
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
      
      // Student ID (bold, larger) - left aligned
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(label.student_id || '', contentX, contentY, {
           width: contentWidth,
           align: 'left'
         });
      
      // Student Name (medium) - left aligned
      const nameY = contentY + 14;
      doc.fontSize(9)
         .font('Helvetica')
         .text(label.student_name || '', contentX, nameY, {
           width: contentWidth,
           align: 'left'
         });
      
      // Grade, Status (New/Returning), and Tests Needed
      const gradeY = nameY + 11;
      
      // Set up for grade and status (same font size)
      doc.fontSize(8)
         .font('Helvetica');
      
      const gradeText = `Grade: ${label.grade || ''}`;
      const studentStatus = label.student_status === 'New' ? 'New' : 'Returning';
      const statusText = studentStatus;
      
      // Measure text widths with current font
      const gradeWidth = doc.widthOfString(gradeText);
      const statusSpacing = 10;
      const statusWidth = doc.widthOfString(statusText);
      
      // Draw grade text
      doc.text(gradeText, contentX, gradeY, {
        width: contentWidth,
        align: 'left'
      });
      
      // Draw status (New/Returning) after grade - same baseline
      doc.text(statusText, contentX + gradeWidth + statusSpacing, gradeY, {
        width: contentWidth - gradeWidth - statusSpacing,
        align: 'left'
      });
      
      // If tests_needed exists, put it more to the right and slightly higher for stand-alone appearance
      if (label.tests_needed && label.tests_needed.trim()) {
        // Switch to larger bold font for tests_needed
        doc.fontSize(16)
           .font('Helvetica-Bold');
        
        // Even more spacing to make it stand-alone (further to the right)
        const testsSpacing = 30; // Increased spacing even more
        // Calculate the X position for tests_needed (after grade + spacing + status + more spacing)
        const testsX = contentX + gradeWidth + statusSpacing + statusWidth + testsSpacing;
        
        // Higher Y position (move up by 4 points) to make it stand out more
        const testsY = gradeY - 4;
        
        // Draw tests_needed with more spacing and higher position
        doc.text(label.tests_needed, testsX, testsY, {
          width: contentWidth - (gradeWidth + statusSpacing + statusWidth + testsSpacing),
          align: 'left'
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

// Export reporting data as PDF
router.post('/reporting/pdf', async (req, res, next) => {
  try {
    const { reportData, school, startDate, endDate, year, notes } = req.body;
    
    if (!reportData || !reportData.summary || !reportData.byGrade) {
      return res.status(400).json({ error: 'Invalid reporting data structure' });
    }
    
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    const schoolName = school === 'all' ? 'All-Schools' : school.replace(/\s+/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename="reporting-${schoolName}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Screening Reporting Statistics', 50, 50, { align: 'center' });
    
    // School and date info
    doc.fontSize(12)
       .font('Helvetica')
       .text(`School: ${school === 'all' ? 'All Schools' : school}`, 50, 85, { align: 'left' });
    
    let infoY = 105;
    if (year) {
      doc.text(`Year: ${year}`, 50, infoY, { align: 'left' });
      infoY += 15;
    }
    if (startDate || endDate) {
      const dateRange = `${startDate || 'N/A'} to ${endDate || 'N/A'}`;
      doc.text(`Date Range: ${dateRange}`, 50, infoY, { align: 'left' });
      infoY += 15;
    }
    
    // Table starting position
    let tableY = infoY + 20;
    const tableTop = tableY;
    const leftMargin = 50;
    const colWidths = {
      grade: 75,
      total: 65,
      vision: 75,
      glasses: 65,  // Moved after vision
      hearing: 75,
      acanthosis: 85,
      scoliosis: 75
    };
    
    // Calculate column positions (reordered: Grade, Total, Vision, Glasses, Hearing, Acanthosis, Scoliosis)
    const colX = {
      grade: leftMargin,
      total: leftMargin + colWidths.grade,
      vision: leftMargin + colWidths.grade + colWidths.total,
      glasses: leftMargin + colWidths.grade + colWidths.total + colWidths.vision,
      hearing: leftMargin + colWidths.grade + colWidths.total + colWidths.vision + colWidths.glasses,
      acanthosis: leftMargin + colWidths.grade + colWidths.total + colWidths.vision + colWidths.glasses + colWidths.hearing,
      scoliosis: leftMargin + colWidths.grade + colWidths.total + colWidths.vision + colWidths.glasses + colWidths.hearing + colWidths.acanthosis
    };
    
    const rowHeight = 22;  // Slightly smaller rows
    const headerRowHeight = 30;  // Taller header row for text to fit
    const cellPadding = 4;  // Slightly less padding
    const screenedColWidth = 42;  // Wider for "Screened" text (was ~37.5)
    const failedColWidth = 33;  // Slightly narrower for "Failed" text
    // Acanthosis is wider (85), so its sub-columns need to be wider too
    const acanthosisScreenedWidth = 50;  // Wider for Acanthosis
    const acanthosisFailedWidth = 35;  // Wider for Acanthosis
    
    // Header row 1 - taller to fit text
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('black');
    
    doc.rect(leftMargin, tableY, colWidths.grade, headerRowHeight).stroke();
    doc.text('Grade', colX.grade + cellPadding, tableY + cellPadding, { width: colWidths.grade - cellPadding * 2 });
    
    doc.rect(colX.total, tableY, colWidths.total, headerRowHeight).stroke();
    doc.text('Total Students', colX.total + cellPadding, tableY + cellPadding, { width: colWidths.total - cellPadding * 2 });
    
    doc.rect(colX.vision, tableY, colWidths.vision, headerRowHeight).stroke();
    doc.text('Vision', colX.vision + cellPadding, tableY + cellPadding, { width: colWidths.vision - cellPadding * 2 });
    
    doc.rect(colX.glasses, tableY, colWidths.glasses, headerRowHeight).stroke();
    doc.text('Glasses/Contacts', colX.glasses + cellPadding, tableY + cellPadding, { width: colWidths.glasses - cellPadding * 2 });
    
    doc.rect(colX.hearing, tableY, colWidths.hearing, headerRowHeight).stroke();
    doc.text('Hearing', colX.hearing + cellPadding, tableY + cellPadding, { width: colWidths.hearing - cellPadding * 2 });
    
    doc.rect(colX.acanthosis, tableY, colWidths.acanthosis, headerRowHeight).stroke();
    doc.text('Acanthosis', colX.acanthosis + cellPadding, tableY + cellPadding, { width: colWidths.acanthosis - cellPadding * 2 });
    
    doc.rect(colX.scoliosis, tableY, colWidths.scoliosis, headerRowHeight).stroke();
    doc.text('Scoliosis', colX.scoliosis + cellPadding, tableY + cellPadding, { width: colWidths.scoliosis - cellPadding * 2 });
    
    tableY += headerRowHeight;
    
    // Header row 2 (subheaders for Screened/Failed)
    doc.fontSize(7)
       .font('Helvetica');
    
    doc.rect(leftMargin, tableY, colWidths.grade, rowHeight).stroke();
    doc.rect(colX.total, tableY, colWidths.total, rowHeight).stroke();
    
    // Vision - wider Screened column (ensure no gap)
    doc.rect(colX.vision, tableY, screenedColWidth, rowHeight).stroke();
    doc.text('Screened', colX.vision + cellPadding, tableY + cellPadding, { width: screenedColWidth - cellPadding * 2 });
    doc.rect(colX.vision + screenedColWidth, tableY, failedColWidth, rowHeight).stroke();
    doc.text('Failed', colX.vision + screenedColWidth + cellPadding, tableY + cellPadding, { width: failedColWidth - cellPadding * 2 });
    
    // Glasses/Contacts (no sub-columns) - ensure it starts right after Vision ends
    const visionEndX = colX.vision + colWidths.vision;
    doc.rect(colX.glasses, tableY, colWidths.glasses, rowHeight).stroke();
    
    // Hearing - wider Screened column (ensure no gap)
    doc.rect(colX.hearing, tableY, screenedColWidth, rowHeight).stroke();
    doc.text('Screened', colX.hearing + cellPadding, tableY + cellPadding, { width: screenedColWidth - cellPadding * 2 });
    doc.rect(colX.hearing + screenedColWidth, tableY, failedColWidth, rowHeight).stroke();
    doc.text('Failed', colX.hearing + screenedColWidth + cellPadding, tableY + cellPadding, { width: failedColWidth - cellPadding * 2 });
    
    // Acanthosis - wider Screened column (ensure no gap, uses wider sub-columns)
    doc.rect(colX.acanthosis, tableY, acanthosisScreenedWidth, rowHeight).stroke();
    doc.text('Screened', colX.acanthosis + cellPadding, tableY + cellPadding, { width: acanthosisScreenedWidth - cellPadding * 2 });
    doc.rect(colX.acanthosis + acanthosisScreenedWidth, tableY, acanthosisFailedWidth, rowHeight).stroke();
    doc.text('Failed', colX.acanthosis + acanthosisScreenedWidth + cellPadding, tableY + cellPadding, { width: acanthosisFailedWidth - cellPadding * 2 });
    
    // Scoliosis - wider Screened column (ensure no gap)
    doc.rect(colX.scoliosis, tableY, screenedColWidth, rowHeight).stroke();
    doc.text('Screened', colX.scoliosis + cellPadding, tableY + cellPadding, { width: screenedColWidth - cellPadding * 2 });
    doc.rect(colX.scoliosis + screenedColWidth, tableY, failedColWidth, rowHeight).stroke();
    doc.text('Failed', colX.scoliosis + screenedColWidth + cellPadding, tableY + cellPadding, { width: failedColWidth - cellPadding * 2 });
    
    tableY += rowHeight;
    
    // Calculate total failed counts from all grades
    let totalVisionFailed = 0;
    let totalHearingFailed = 0;
    let totalAcanthosisFailed = 0;
    let totalScoliosisFailed = 0;
    let totalGlassesContacts = 0;
    
    reportData.byGrade.forEach(gradeData => {
      totalVisionFailed += gradeData.vision?.failed || 0;
      totalHearingFailed += gradeData.hearing?.failed || 0;
      totalAcanthosisFailed += gradeData.acanthosis?.failed || 0;
      totalScoliosisFailed += gradeData.scoliosis?.failed || 0;
      totalGlassesContacts += gradeData.glassesContacts || 0;
    });
    
    // Summary row (Total)
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('black');
    
    const summaryRowY = tableY;
    
    // Grade column - say "Total"
    doc.rect(leftMargin, summaryRowY, colWidths.grade, rowHeight).fillAndStroke('#E3F2FD', 'black');
    doc.fillColor('black');
    doc.text('Total', colX.grade + cellPadding, summaryRowY + 6, { width: colWidths.grade - cellPadding * 2, align: 'left' });
    
    // Total Students column
    doc.rect(colX.total, summaryRowY, colWidths.total, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const totalStudentsText = String(reportData.summary?.totalStudents ?? 0);
    doc.fillColor('black');
    doc.text(totalStudentsText, colX.total + cellPadding, summaryRowY + 6, { width: colWidths.total - cellPadding * 2, align: 'left' });
    
    // Vision columns - wider Screened
    doc.rect(colX.vision, summaryRowY, screenedColWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const visionScreenedText = String(reportData.summary?.totalVision ?? 0);
    doc.fillColor('black');
    doc.text(visionScreenedText, colX.vision + cellPadding, summaryRowY + 6, { width: screenedColWidth - cellPadding * 2, align: 'left' });
    doc.rect(colX.vision + screenedColWidth, summaryRowY, failedColWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const visionFailedText = String(totalVisionFailed);
    doc.fillColor('black');
    doc.text(visionFailedText, colX.vision + screenedColWidth + cellPadding, summaryRowY + 6, { width: failedColWidth - cellPadding * 2, align: 'left' });
    
    // Glasses/Contacts column (moved after Vision)
    doc.rect(colX.glasses, summaryRowY, colWidths.glasses, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const glassesText = String(totalGlassesContacts);
    doc.fillColor('black');
    doc.text(glassesText, colX.glasses + cellPadding, summaryRowY + 6, { width: colWidths.glasses - cellPadding * 2, align: 'left' });
    
    // Hearing columns - wider Screened
    doc.rect(colX.hearing, summaryRowY, screenedColWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const hearingScreenedText = String(reportData.summary?.totalHearing ?? 0);
    doc.fillColor('black');
    doc.text(hearingScreenedText, colX.hearing + cellPadding, summaryRowY + 6, { width: screenedColWidth - cellPadding * 2, align: 'left' });
    doc.rect(colX.hearing + screenedColWidth, summaryRowY, failedColWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const hearingFailedText = String(totalHearingFailed);
    doc.fillColor('black');
    doc.text(hearingFailedText, colX.hearing + screenedColWidth + cellPadding, summaryRowY + 6, { width: failedColWidth - cellPadding * 2, align: 'left' });
    
    // Acanthosis columns - wider Screened (uses wider sub-columns)
    doc.rect(colX.acanthosis, summaryRowY, acanthosisScreenedWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const acanthosisScreenedText = String(reportData.summary?.totalAcanthosis ?? 0);
    doc.fillColor('black');
    doc.text(acanthosisScreenedText, colX.acanthosis + cellPadding, summaryRowY + 6, { width: acanthosisScreenedWidth - cellPadding * 2, align: 'left' });
    doc.rect(colX.acanthosis + acanthosisScreenedWidth, summaryRowY, acanthosisFailedWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const acanthosisFailedText = String(totalAcanthosisFailed);
    doc.fillColor('black');
    doc.text(acanthosisFailedText, colX.acanthosis + acanthosisScreenedWidth + cellPadding, summaryRowY + 6, { width: acanthosisFailedWidth - cellPadding * 2, align: 'left' });
    
    // Scoliosis columns - wider Screened
    doc.rect(colX.scoliosis, summaryRowY, screenedColWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const scoliosisScreenedText = String(reportData.summary?.totalScoliosis ?? 0);
    doc.fillColor('black');
    doc.text(scoliosisScreenedText, colX.scoliosis + cellPadding, summaryRowY + 6, { width: screenedColWidth - cellPadding * 2, align: 'left' });
    doc.rect(colX.scoliosis + screenedColWidth, summaryRowY, failedColWidth, rowHeight).fillAndStroke('#E3F2FD', 'black');
    const scoliosisFailedText = String(totalScoliosisFailed);
    doc.fillColor('black');
    doc.text(scoliosisFailedText, colX.scoliosis + screenedColWidth + cellPadding, summaryRowY + 6, { width: failedColWidth - cellPadding * 2, align: 'left' });
    
    tableY += rowHeight;
    
    // Grade rows
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('black');
    
    for (const gradeData of reportData.byGrade) {
      // Check if we need a new page
      if (tableY + rowHeight > 750) {
        doc.addPage();
        tableY = 50;
      }
      
      doc.fillColor('black');
      doc.rect(leftMargin, tableY, colWidths.grade, rowHeight).stroke();
      doc.text(gradeData.grade || '', colX.grade + cellPadding, tableY + 6, { width: colWidths.grade - cellPadding * 2, align: 'left' });
      
      doc.rect(colX.total, tableY, colWidths.total, rowHeight).stroke();
      doc.text(String(gradeData.totalStudents ?? 0), colX.total + cellPadding, tableY + 6, { width: colWidths.total - cellPadding * 2, align: 'left' });
      
      // Vision - wider Screened column
      doc.rect(colX.vision, tableY, screenedColWidth, rowHeight).stroke();
      doc.text(String(gradeData.vision?.screened ?? 0), colX.vision + cellPadding, tableY + 6, { width: screenedColWidth - cellPadding * 2, align: 'left' });
      doc.rect(colX.vision + screenedColWidth, tableY, failedColWidth, rowHeight).stroke();
      doc.text(String(gradeData.vision?.failed ?? 0), colX.vision + screenedColWidth + cellPadding, tableY + 6, { width: failedColWidth - cellPadding * 2, align: 'left' });
      
      // Glasses/Contacts (moved after Vision)
      doc.rect(colX.glasses, tableY, colWidths.glasses, rowHeight).stroke();
      doc.text(String(gradeData.glassesContacts ?? 0), colX.glasses + cellPadding, tableY + 6, { width: colWidths.glasses - cellPadding * 2, align: 'left' });
      
      // Hearing - wider Screened column
      doc.rect(colX.hearing, tableY, screenedColWidth, rowHeight).stroke();
      doc.text(String(gradeData.hearing?.screened ?? 0), colX.hearing + cellPadding, tableY + 6, { width: screenedColWidth - cellPadding * 2, align: 'left' });
      doc.rect(colX.hearing + screenedColWidth, tableY, failedColWidth, rowHeight).stroke();
      doc.text(String(gradeData.hearing?.failed ?? 0), colX.hearing + screenedColWidth + cellPadding, tableY + 6, { width: failedColWidth - cellPadding * 2, align: 'left' });
      
      // Acanthosis - wider Screened column (uses wider sub-columns)
      doc.rect(colX.acanthosis, tableY, acanthosisScreenedWidth, rowHeight).stroke();
      doc.text(String(gradeData.acanthosis?.screened ?? 0), colX.acanthosis + cellPadding, tableY + 6, { width: acanthosisScreenedWidth - cellPadding * 2, align: 'left' });
      doc.rect(colX.acanthosis + acanthosisScreenedWidth, tableY, acanthosisFailedWidth, rowHeight).stroke();
      doc.text(String(gradeData.acanthosis?.failed ?? 0), colX.acanthosis + acanthosisScreenedWidth + cellPadding, tableY + 6, { width: acanthosisFailedWidth - cellPadding * 2, align: 'left' });
      
      // Scoliosis - wider Screened column
      doc.rect(colX.scoliosis, tableY, screenedColWidth, rowHeight).stroke();
      doc.text(String(gradeData.scoliosis?.screened ?? 0), colX.scoliosis + cellPadding, tableY + 6, { width: screenedColWidth - cellPadding * 2, align: 'left' });
      doc.rect(colX.scoliosis + screenedColWidth, tableY, failedColWidth, rowHeight).stroke();
      doc.text(String(gradeData.scoliosis?.failed ?? 0), colX.scoliosis + screenedColWidth + cellPadding, tableY + 6, { width: failedColWidth - cellPadding * 2, align: 'left' });
      
      tableY += rowHeight;
    }
    
    // Add notes section at the bottom of the first page
    if (notes && notes.trim()) {
      // Calculate available space on first page
      const pageHeight = 792; // Letter size height in points
      const bottomMargin = 50;
      const availableSpace = pageHeight - bottomMargin - tableY;
      
      // If not enough space, add new page
      if (availableSpace < 120) {
        doc.addPage();
        tableY = 50;
      } else {
        tableY += 20; // Add some spacing after table
      }
      
      // Notes section header
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('black')
         .text('Notes', leftMargin, tableY, { align: 'left' });
      
      tableY += 20;
      
      // Notes content - use remaining space on page
      const notesWidth = 500;
      const notesMaxHeight = pageHeight - bottomMargin - tableY - 20;
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('black')
         .text(notes, leftMargin, tableY, {
           width: notesWidth,
           align: 'left',
           lineGap: 4,
           height: notesMaxHeight,
           ellipsis: true
         });
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    next(error);
  }
});

// Search and export students with comprehensive data
router.get('/students', async (req, res, next) => {
  try {
    const {
      school = 'all',
      grade,
      status,
      year,
      startDate,
      endDate,
      search
    } = req.query;

    // Start with students query
    let studentsQuery = supabase
      .from('students')
      .select('*');

    // Apply school filter
    if (school !== 'all') {
      studentsQuery = studentsQuery.eq('school', school);
    }

    // Apply grade filter if provided
    if (grade) {
      const grades = grade.split(',');
      studentsQuery = studentsQuery.in('grade', grades);
    }

    // Apply status filter if provided
    if (status && status !== 'all') {
      studentsQuery = studentsQuery.eq('status', status);
    }

    // Apply search filter (name or ID)
    if (search) {
      studentsQuery = studentsQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,unique_id.ilike.%${search}%`);
    }

    const { data: studentsData, error: studentsError } = await studentsQuery;

    if (studentsError) throw studentsError;

    if (!studentsData || studentsData.length === 0) {
      return res.json({
        students: [],
        count: 0
      });
    }

    // Get all unique_ids from students
    const uniqueIds = studentsData.map(s => s.unique_id).filter(Boolean);

    // Fetch screening_results for these students
    let screeningMap = {};
    if (uniqueIds.length > 0) {
      let screeningQuery = supabase
        .from('screening_results')
        .select('*')
        .in('unique_id', uniqueIds);

      // Apply year filter if provided (uses created_at from screening_results)
      if (year) {
        const yearStart = `${year}-01-01T00:00:00Z`;
        const yearEnd = `${year}-12-31T23:59:59Z`;
        screeningQuery = screeningQuery.gte('created_at', yearStart);
        screeningQuery = screeningQuery.lte('created_at', yearEnd);
      }

      // Apply screening date filters if provided
      if (startDate) {
        screeningQuery = screeningQuery.gte('initial_screening_date', startDate);
      }
      if (endDate) {
        screeningQuery = screeningQuery.lte('initial_screening_date', endDate);
      }

      const { data: screeningData, error: screeningError } = await screeningQuery;
      
      if (screeningError) {
        console.error('Error fetching screening results:', screeningError);
      } else if (screeningData) {
        // Create map by unique_id (keep most recent if multiple)
        screeningData.forEach(row => {
          const uniqueId = row.unique_id;
          if (uniqueId) {
            if (!screeningMap[uniqueId] || 
                new Date(row.created_at || row.initial_screening_date || 0) > 
                new Date(screeningMap[uniqueId].created_at || screeningMap[uniqueId].initial_screening_date || 0)) {
              screeningMap[uniqueId] = row;
            }
          }
        });
      }
    }

    // Transform data - combine students with screening results, include ALL fields
    const results = studentsData.map((student) => {
      const screeningRow = screeningMap[student.unique_id] || null;
      
      return {
        // Student basic info
        unique_id: student.unique_id || '',
        student_id: screeningRow?.student_id || student.unique_id || '',
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        full_name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        grade: student.grade || '',
        gender: student.gender || '',
        dob: student.dob || null,
        school: student.school || '',
        teacher: student.teacher || '',
        status: student.status || '',
        notes: student.notes || '',
        created_at: student.created_at || null,
        
        // Screening metadata
        screening_year: screeningRow?.screening_year || null,
        initial_screening_date: screeningRow?.initial_screening_date || null,
        was_absent: screeningRow?.was_absent ?? false,
        glasses_or_contacts: screeningRow?.glasses_or_contacts || screeningRow?.vision_initial_glasses || screeningRow?.vision_rescreen_glasses || null,
        
        // Vision
        vision_required: screeningRow?.vision_required ?? false,
        vision_complete: screeningRow?.vision_complete ?? false,
        vision_initial_right: screeningRow?.vision_initial_right_eye ?? null,
        vision_initial_left: screeningRow?.vision_initial_left_eye ?? null,
        vision_rescreen_right: screeningRow?.vision_rescreen_right_eye ?? null,
        vision_rescreen_left: screeningRow?.vision_rescreen_left_eye ?? null,
        vision_initial_glasses: screeningRow?.vision_initial_glasses || null,
        vision_rescreen_glasses: screeningRow?.vision_rescreen_glasses || null,
        
        // Hearing
        hearing_required: screeningRow?.hearing_required ?? false,
        hearing_complete: screeningRow?.hearing_complete ?? false,
        hearing_initial_right_1000: screeningRow?.hearing_initial_right_1000 ?? null,
        hearing_initial_right_2000: screeningRow?.hearing_initial_right_2000 ?? null,
        hearing_initial_right_4000: screeningRow?.hearing_initial_right_4000 ?? null,
        hearing_initial_left_1000: screeningRow?.hearing_initial_left_1000 ?? null,
        hearing_initial_left_2000: screeningRow?.hearing_initial_left_2000 ?? null,
        hearing_initial_left_4000: screeningRow?.hearing_initial_left_4000 ?? null,
        hearing_rescreen_right_1000: screeningRow?.hearing_rescreen_right_1000 ?? null,
        hearing_rescreen_right_2000: screeningRow?.hearing_rescreen_right_2000 ?? null,
        hearing_rescreen_right_4000: screeningRow?.hearing_rescreen_right_4000 ?? null,
        hearing_rescreen_left_1000: screeningRow?.hearing_rescreen_left_1000 ?? null,
        hearing_rescreen_left_2000: screeningRow?.hearing_rescreen_left_2000 ?? null,
        hearing_rescreen_left_4000: screeningRow?.hearing_rescreen_left_4000 ?? null,
        
        // Acanthosis
        acanthosis_required: screeningRow?.acanthosis_required ?? false,
        acanthosis_complete: screeningRow?.acanthosis_complete ?? false,
        acanthosis_initial: screeningRow?.acanthosis_initial_result ?? null,
        acanthosis_rescreen: screeningRow?.acanthosis_rescreen_result ?? null,
        
        // Scoliosis
        scoliosis_required: screeningRow?.scoliosis_required ?? false,
        scoliosis_complete: screeningRow?.scoliosis_complete ?? false,
        scoliosis_initial: screeningRow?.scoliosis_initial_result ?? null,
        scoliosis_rescreen: screeningRow?.scoliosis_rescreen_result ?? null,
        
        // Notes
        initial_notes: screeningRow?.initial_notes || null,
        rescreen_notes: screeningRow?.rescreen_notes || null,
        
        // Timestamps
        screening_created_at: screeningRow?.created_at || null,
        screening_updated_at: screeningRow?.updated_at || null
      };
    });

    res.json({
      students: results,
      count: results.length
    });

  } catch (error) {
    next(error);
  }
});

// Export students as CSV
router.get('/students/export', async (req, res, next) => {
  try {
    // Reuse the same search logic
    const {
      school = 'all',
      grade,
      status,
      year,
      startDate,
      endDate,
      search
    } = req.query;

    // Start with students query
    let studentsQuery = supabase
      .from('students')
      .select('*');

    if (school !== 'all') {
      studentsQuery = studentsQuery.eq('school', school);
    }

    if (grade) {
      const grades = grade.split(',');
      studentsQuery = studentsQuery.in('grade', grades);
    }

    if (status && status !== 'all') {
      studentsQuery = studentsQuery.eq('status', status);
    }

    if (search) {
      studentsQuery = studentsQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,unique_id.ilike.%${search}%`);
    }

    const { data: studentsData, error: studentsError } = await studentsQuery;

    if (studentsError) throw studentsError;

    if (!studentsData || studentsData.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="students-export.csv"');
      return res.send('No students found');
    }

    const uniqueIds = studentsData.map(s => s.unique_id).filter(Boolean);
    let screeningMap = {};

    if (uniqueIds.length > 0) {
      let screeningQuery = supabase
        .from('screening_results')
        .select('*')
        .in('unique_id', uniqueIds);

      if (year) {
        const yearStart = `${year}-01-01T00:00:00Z`;
        const yearEnd = `${year}-12-31T23:59:59Z`;
        screeningQuery = screeningQuery.gte('created_at', yearStart);
        screeningQuery = screeningQuery.lte('created_at', yearEnd);
      }

      if (startDate) {
        screeningQuery = screeningQuery.gte('initial_screening_date', startDate);
      }
      if (endDate) {
        screeningQuery = screeningQuery.lte('initial_screening_date', endDate);
      }

      const { data: screeningData, error: screeningError } = await screeningQuery;
      
      if (!screeningError && screeningData) {
        screeningData.forEach(row => {
          const uniqueId = row.unique_id;
          if (uniqueId) {
            if (!screeningMap[uniqueId] || 
                new Date(row.created_at || row.initial_screening_date || 0) > 
                new Date(screeningMap[uniqueId].created_at || screeningMap[uniqueId].initial_screening_date || 0)) {
              screeningMap[uniqueId] = row;
            }
          }
        });
      }
    }

    // Helper function to determine if a test failed (F = fail)
    const didTestFail = (value) => {
      if (!value) return false;
      return String(value).toUpperCase() === 'F';
    };
    
    // Helper function to format vision result as "20/X"
    const formatVisionResult = (value) => {
      if (!value || value === 'F') return value || '';
      // If it's a number, format as "20/X"
      const num = parseInt(value);
      if (!isNaN(num)) {
        return `20/${num}`;
      }
      return value;
    };
    
    // Helper function to get hearing failure details
    const getHearingFailureDetails = (screeningRow) => {
      if (!screeningRow) return '';
      
      const failures = [];
      
      // Check all hearing fields for failures
      const checkField = (ear, freq, initial, rescreen) => {
        const initialVal = screeningRow[`hearing_initial_${ear}_${freq}`];
        const rescreenVal = screeningRow[`hearing_rescreen_${ear}_${freq}`];
        
        if (didTestFail(initialVal)) {
          failures.push(`${ear} ear ${freq}Hz (initial)`);
        }
        if (didTestFail(rescreenVal)) {
          failures.push(`${ear} ear ${freq}Hz (rescreen)`);
        }
      };
      
      checkField('right', '1000', 'initial', 'rescreen');
      checkField('right', '2000', 'initial', 'rescreen');
      checkField('right', '4000', 'initial', 'rescreen');
      checkField('left', '1000', 'initial', 'rescreen');
      checkField('left', '2000', 'initial', 'rescreen');
      checkField('left', '4000', 'initial', 'rescreen');
      
      return failures.length > 0 ? failures.join('; ') : '';
    };
    
    // Transform to simplified CSV format
    const csvData = studentsData.map((student) => {
      const screeningRow = screeningMap[student.unique_id] || null;
      
      // Determine pass/fail for each test type (check both initial and rescreen)
      const visionFailed = screeningRow ? (
        didTestFail(screeningRow.vision_initial_right_eye) ||
        didTestFail(screeningRow.vision_initial_left_eye) ||
        didTestFail(screeningRow.vision_rescreen_right_eye) ||
        didTestFail(screeningRow.vision_rescreen_left_eye)
      ) : false;
      
      const hearingFailed = screeningRow ? (
        didTestFail(screeningRow.hearing_initial_right_1000) ||
        didTestFail(screeningRow.hearing_initial_right_2000) ||
        didTestFail(screeningRow.hearing_initial_right_4000) ||
        didTestFail(screeningRow.hearing_initial_left_1000) ||
        didTestFail(screeningRow.hearing_initial_left_2000) ||
        didTestFail(screeningRow.hearing_initial_left_4000) ||
        didTestFail(screeningRow.hearing_rescreen_right_1000) ||
        didTestFail(screeningRow.hearing_rescreen_right_2000) ||
        didTestFail(screeningRow.hearing_rescreen_right_4000) ||
        didTestFail(screeningRow.hearing_rescreen_left_1000) ||
        didTestFail(screeningRow.hearing_rescreen_left_2000) ||
        didTestFail(screeningRow.hearing_rescreen_left_4000)
      ) : false;
      
      const acanthosisFailed = screeningRow ? (
        didTestFail(screeningRow.acanthosis_initial_result) ||
        didTestFail(screeningRow.acanthosis_rescreen_result)
      ) : false;
      
      const scoliosisFailed = screeningRow ? (
        didTestFail(screeningRow.scoliosis_initial_result) ||
        didTestFail(screeningRow.scoliosis_rescreen_result)
      ) : false;
      
      // Get best vision results (prefer rescreen if available, otherwise initial)
      const visionRight = screeningRow?.vision_rescreen_right_eye || screeningRow?.vision_initial_right_eye || '';
      const visionLeft = screeningRow?.vision_rescreen_left_eye || screeningRow?.vision_initial_left_eye || '';
      
      // Get glasses/contacts info
      const glassesContacts = screeningRow?.glasses_or_contacts || 
                              screeningRow?.vision_rescreen_glasses || 
                              screeningRow?.vision_initial_glasses || 
                              '';
      
      return {
        // Student Basic Information
        'First Name': student.first_name || '',
        'Last Name': student.last_name || '',
        'School': student.school || '',
        'Grade': student.grade || '',
        'Gender': student.gender || '',
        'Date of Birth': student.dob || '',
        'Glasses/Contacts': glassesContacts || '',
        
        // Vision Results
        'Vision Right Eye': formatVisionResult(visionRight),
        'Vision Left Eye': formatVisionResult(visionLeft),
        'Vision Pass/Fail': visionFailed ? 'Fail' : (visionRight || visionLeft ? 'Pass' : ''),
        
        // Hearing Results
        'Hearing Pass/Fail': hearingFailed ? 'Fail' : (screeningRow && (
          screeningRow.hearing_initial_right_1000 || screeningRow.hearing_initial_left_1000 ||
          screeningRow.hearing_rescreen_right_1000 || screeningRow.hearing_rescreen_left_1000
        )) ? 'Pass' : '',
        'Hearing Failure Details': hearingFailed ? getHearingFailureDetails(screeningRow) : '',
        
        // Acanthosis Results
        'Acanthosis Pass/Fail': acanthosisFailed ? 'Fail' : (screeningRow && (
          screeningRow.acanthosis_initial_result || screeningRow.acanthosis_rescreen_result
        )) ? 'Pass' : '',
        
        // Scoliosis Results
        'Scoliosis Pass/Fail': scoliosisFailed ? 'Fail' : (screeningRow && (
          screeningRow.scoliosis_initial_result || screeningRow.scoliosis_rescreen_result
        )) ? 'Pass' : ''
      };
    });

    const csv = convertToCSV(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    const schoolName = school === 'all' ? 'All-Schools' : school.replace(/\s+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="students-export-${schoolName}-${dateStr}.csv"`);
    res.send(csv);

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
      // Escape quotes and wrap in quotes
      const stringValue = value !== null && value !== undefined ? String(value) : '';
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}


export default router;

