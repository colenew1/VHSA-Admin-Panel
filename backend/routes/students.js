import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get incomplete students
router.get('/incomplete', async (req, res, next) => {
  try {
    const { school } = req.query;
    
    let query = supabase.from('incomplete_students').select('*');
    
    if (school && school !== 'all') {
      query = query.eq('school', school);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      students: data,
      count: data.length
    });
    
  } catch (error) {
    next(error);
  }
});

// Search students by Student ID
router.get('/search/id', async (req, res, next) => {
  try {
    const { studentId } = req.query;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    console.log('Searching for student ID:', studentId);
    
    // Search in students table by unique_id (case-insensitive partial match)
    // Try exact match first, then partial match
    let students = [];
    
    // First try exact match (case-insensitive)
    const { data: exactMatch, error: exactError } = await supabase
      .from('students')
      .select('*')
      .ilike('unique_id', studentId.trim());
    
    if (exactError) {
      console.error('Exact match error:', exactError);
    } else if (exactMatch && exactMatch.length > 0) {
      students = exactMatch;
      console.log('Found exact match:', exactMatch.length);
    } else {
      // If no exact match, try partial match
      const { data: partialMatch, error: partialError } = await supabase
        .from('students')
        .select('*')
        .ilike('unique_id', `%${studentId.trim()}%`);
      
      if (partialError) {
        console.error('Partial match error:', partialError);
        throw partialError;
      }
      
      students = partialMatch || [];
      console.log('Found partial matches:', students.length);
    }
    
    console.log('Total students found:', students.length);
    
    // Get screening results for found students
    const uniqueIds = students.map(s => s.unique_id).filter(Boolean);
    let screeningMap = {};
    
    if (uniqueIds.length > 0) {
      const { data: screeningData, error: screeningError } = await supabase
        .from('screening_results')
        .select('*')
        .in('unique_id', uniqueIds);
      
      if (screeningError) {
        console.error('Screening data error:', screeningError);
        throw screeningError;
      }
      
      if (screeningData) {
        screeningData.forEach(screening => {
          screeningMap[screening.unique_id] = screening;
        });
        console.log('Found screening data for', screeningData.length, 'students');
      }
    }
    
    // Combine student and screening data
    const results = students.map(student => {
      const screening = screeningMap[student.unique_id] || null;
      return {
        ...student,
        screening: screening
      };
    });
    
    console.log('Returning', results.length, 'results');
    
    res.json({
      students: results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Search by ID error:', error);
    next(error);
  }
});

// Search students by Last Name and optionally School
router.get('/search/name', async (req, res, next) => {
  try {
    const { lastName, school } = req.query;
    
    if (!lastName) {
      return res.status(400).json({ error: 'Last name is required' });
    }
    
    // Build query
    let query = supabase
      .from('students')
      .select('*')
      .ilike('last_name', `%${lastName}%`);
    
    if (school && school !== 'all') {
      query = query.eq('school', school);
    }
    
    const { data: students, error: studentsError } = await query;
    
    if (studentsError) throw studentsError;
    
    // Get screening results for found students
    const uniqueIds = students.map(s => s.unique_id).filter(Boolean);
    let screeningMap = {};
    
    if (uniqueIds.length > 0) {
      const { data: screeningData, error: screeningError } = await supabase
        .from('screening_results')
        .select('*')
        .in('unique_id', uniqueIds);
      
      if (screeningError) throw screeningError;
      
      screeningData.forEach(screening => {
        screeningMap[screening.unique_id] = screening;
      });
    }
    
    // Combine student and screening data
    const results = students.map(student => {
      const screening = screeningMap[student.unique_id] || null;
      return {
        ...student,
        screening: screening
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

// Get single student with full screening data by unique_id
router.get('/:uniqueId', async (req, res, next) => {
  try {
    const { uniqueId } = req.params;
    
    // Get student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('unique_id', uniqueId)
      .single();
    
    if (studentError) throw studentError;
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get screening results
    const { data: screening, error: screeningError } = await supabase
      .from('screening_results')
      .select('*')
      .eq('unique_id', uniqueId)
      .single();
    
    if (screeningError && screeningError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw screeningError;
    }
    
    res.json({
      student: student,
      screening: screening || null
    });
    
  } catch (error) {
    next(error);
  }
});

// Get next student ID for a school
router.get('/next-id/:schoolName', async (req, res, next) => {
  try {
    const { schoolName } = req.params;
    
    if (!schoolName) {
      return res.status(400).json({ error: 'School name is required' });
    }
    
    // Generate school abbreviation (simple version - can be enhanced)
    const generateAbbreviation = (name) => {
      const cleaned = name
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
    
    const abbreviation = generateAbbreviation(schoolName);
    const pattern = `${abbreviation}%`;
    
    // Get all existing student IDs for this school that match the pattern
    const { data: existingStudents, error } = await supabase
      .from('students')
      .select('unique_id')
      .ilike('unique_id', pattern)
      .not('unique_id', 'is', null);
    
    if (error) throw error;
    
    // Extract numbers from existing IDs
    const numbers = existingStudents
      .map(s => {
        const match = s.unique_id?.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter(n => n > 0);
    
    // Find next available number
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    
    // Format as ABBREV0001, ABBREV0002, etc. (4 digits)
    const nextId = `${abbreviation}${String(nextNumber).padStart(4, '0')}`;
    
    res.json({ nextId, abbreviation, nextNumber });
    
  } catch (error) {
    next(error);
  }
});

// Create new student
router.post('/', async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      grade,
      gender,
      dob,
      school,
      teacher,
      status,
      unique_id
    } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !grade || !gender || !dob || !school || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Auto-generate unique_id if not provided
    let finalUniqueId = unique_id;
    if (!finalUniqueId) {
      // Generate school abbreviation (same logic as getNextStudentId)
      const generateAbbreviation = (name) => {
        const cleaned = name
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
      
      const abbreviation = generateAbbreviation(school);
      const pattern = `${abbreviation}%`;
      
      // Get all existing student IDs for this school that match the pattern
      const { data: existingStudents, error: existingError } = await supabase
        .from('students')
        .select('unique_id')
        .ilike('unique_id', pattern)
        .not('unique_id', 'is', null);
      
      if (existingError) throw existingError;
      
      // Extract numbers from existing IDs
      const numbers = existingStudents
        .map(s => {
          const match = s.unique_id?.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        })
        .filter(n => n > 0);
      
      // Find next available number
      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      
      // Format as ABBREV0001, ABBREV0002, etc. (4 digits)
      finalUniqueId = `${abbreviation}${String(nextNumber).padStart(4, '0')}`;
    }
    
    // Insert student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        first_name,
        last_name,
        grade,
        gender,
        dob,
        school,
        teacher: teacher || null,
        status,
        unique_id: finalUniqueId
      })
      .select()
      .single();
    
    if (studentError) throw studentError;
    
    res.status(201).json({
      student: student,
      message: 'Student created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Search students with notes - supports filtering by various criteria
router.get('/search/notes', async (req, res, next) => {
  try {
    const {
      school = 'all',
      year,
      startDate,
      endDate,
      createdStartDate,
      createdEndDate,
      grade,
      hasNotes = 'all' // 'all', 'yes', 'no'
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

    // Apply created date filter (when student record was created)
    if (createdStartDate) {
      studentsQuery = studentsQuery.gte('created_at', createdStartDate);
    }
    if (createdEndDate) {
      studentsQuery = studentsQuery.lte('created_at', createdEndDate);
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

    // Transform data - combine students with screening results
    let results = studentsData.map((student) => {
      const screeningRow = screeningMap[student.unique_id] || null;
      
      return {
        student_id: screeningRow?.student_id || null,
        unique_id: student.unique_id || '',
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        grade: student.grade || '',
        gender: student.gender || '',
        dob: student.dob || null,
        school: student.school || '',
        teacher: student.teacher || '',
        status: student.status || '',
        notes: student.notes || '', // Student notes
        // Screening data
        initial_screening_date: screeningRow?.initial_screening_date || null,
        was_absent: screeningRow?.was_absent ?? false,
        glasses_or_contacts: screeningRow?.vision_initial_glasses || screeningRow?.vision_rescreen_glasses || null,
        status_override: screeningRow?.status_override || null,
        // Vision
        vision_required: screeningRow?.vision_required ?? false,
        vision_complete: screeningRow?.vision_complete ?? false,
        vision_initial_right: screeningRow?.vision_initial_right_eye ?? null,
        vision_initial_left: screeningRow?.vision_initial_left_eye ?? null,
        vision_rescreen_right: screeningRow?.vision_rescreen_right_eye ?? null,
        vision_rescreen_left: screeningRow?.vision_rescreen_left_eye ?? null,
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
        // Metadata
        created_at: student.created_at || null,
        screening_created_at: screeningRow?.created_at || null
      };
    });

    // Filter by hasNotes if specified
    if (hasNotes === 'yes') {
      results = results.filter(r => r.notes && r.notes.trim() !== '');
    } else if (hasNotes === 'no') {
      results = results.filter(r => !r.notes || r.notes.trim() === '');
    }

    res.json({
      students: results,
      count: results.length
    });

  } catch (error) {
    next(error);
  }
});

export default router;

