import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

/**
 * Get detailed screening data for spreadsheet
 * 
 * Returns JSON structure:
 * {
 *   data: [
 *     {
 *       student_id: string,
 *       unique_id: string,
 *       first_name: string,
 *       last_name: string,
 *       grade: string,
 *       gender: string,
 *       dob: string (ISO date),
 *       school: string,
 *       teacher: string,
 *       status: string,
 *       initial_screening_date: string (ISO date),
 *       was_absent: boolean,
 *       glasses_or_contacts: string,
 *       vision_required: boolean,
 *       vision_complete: boolean,
 *       vision_initial_right: string (e.g., "20/20", "P", "F"),
 *       vision_initial_left: string,
 *       vision_rescreen_right: string,
 *       vision_rescreen_left: string,
 *       hearing_required: boolean,
 *       hearing_complete: boolean,
 *       hearing_initial_right: string,
 *       hearing_initial_left: string,
 *       hearing_rescreen_right: string,
 *       hearing_rescreen_left: string,
 *       acanthosis_required: boolean,
 *       acanthosis_complete: boolean,
 *       acanthosis_initial: string ("P" or "F"),
 *       acanthosis_rescreen: string,
 *       scoliosis_required: boolean,
 *       scoliosis_complete: boolean,
 *       scoliosis_initial: string ("P" or "F"),
 *       scoliosis_rescreen: string
 *     }
 *   ],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
router.get('/data', async (req, res, next) => {
  try {
    const {
      school = 'all',
      startDate,
      endDate,
      year,
      grade,
      gender,
      returning,
      status,
      limit = 50,
      offset = 0
    } = req.query;

    // Start with ALL students, then LEFT JOIN with screening_results
    // This ensures we get all students, even those without screening records
    let studentsQuery = supabase
      .from('students')
      .select('*');

    // Apply school filter on students table
    if (school !== 'all') {
      studentsQuery = studentsQuery.eq('school', school);
    }

    // Apply grade filter if provided
    if (grade) {
      const grades = grade.split(',');
      studentsQuery = studentsQuery.in('grade', grades);
    }

    // Apply gender filter if provided
    if (gender) {
      studentsQuery = studentsQuery.eq('gender', gender);
    }

    // Apply returning filter if provided
    if (returning) {
      const isReturning = returning === 'true';
      studentsQuery = studentsQuery.eq('status', isReturning ? 'returning' : 'new');
    }

    // Get total count before pagination
    const countQuery = supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    
    if (school !== 'all') countQuery.eq('school', school);
    if (grade) {
      const grades = grade.split(',');
      countQuery.in('grade', grades);
    }
    if (gender) countQuery.eq('gender', gender);
    if (returning) {
      const isReturning = returning === 'true';
      countQuery.eq('status', isReturning ? 'returning' : 'new');
    }
    
    const { count } = await countQuery;
    
    // Apply pagination
    studentsQuery = studentsQuery.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Order by last name, then first name
    studentsQuery = studentsQuery.order('last_name', { ascending: true });
    studentsQuery = studentsQuery.order('first_name', { ascending: true });

    const { data: studentsData, error: studentsError } = await studentsQuery;

    if (studentsError) throw studentsError;

    if (!studentsData || studentsData.length === 0) {
      return res.json({
        data: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }

    console.log(`📊 Found ${studentsData.length} students`);
    
    // Get all unique_ids from students
    const uniqueIds = studentsData.map(s => s.unique_id).filter(Boolean);

    // Fetch screening_results for these students
    let screeningMap = {};
    if (uniqueIds.length > 0) {
      let screeningQuery = supabase
        .from('screening_results')
        .select('*')
        .in('unique_id', uniqueIds);

      // Apply year filter if provided - uses created_at (when record was created/intaken)
      // This is more accurate for tracking which screening cycle/year a record belongs to
      // Otherwise use startDate/endDate filters on initial_screening_date
      if (year) {
        const yearStart = `${year}-01-01T00:00:00Z`;
        const yearEnd = `${year}-12-31T23:59:59Z`;
        screeningQuery = screeningQuery.gte('created_at', yearStart);
        screeningQuery = screeningQuery.lte('created_at', yearEnd);
      } else {
        // Apply date filters on screening_results if provided
        if (startDate) screeningQuery = screeningQuery.gte('initial_screening_date', startDate);
        if (endDate) screeningQuery = screeningQuery.lte('initial_screening_date', endDate);
      }

      const { data: screeningData, error: screeningError } = await screeningQuery;
      
      if (screeningError) {
        console.error('❌ Error fetching screening results:', screeningError);
      } else if (screeningData) {
        // Create map by unique_id
        // If year filter is applied, we should only get one record per student for that year
        // But if not, we'll keep the most recent one (for backwards compatibility)
        screeningData.forEach(row => {
          const uniqueId = row.unique_id;
          if (uniqueId) {
            // Extract year from created_at (when record was created/intaken)
            // This represents which screening cycle/year this record belongs to
            const rowYear = row.created_at 
              ? new Date(row.created_at).getFullYear()
              : (row.initial_screening_date ? new Date(row.initial_screening_date).getFullYear() : new Date().getFullYear());
            
            // If year filter is provided, we can have multiple records per student (different years)
            // But for the same year, keep the most recent one
            const key = year ? `${uniqueId}_${rowYear}` : uniqueId;
            
            // If multiple records for same year, keep the most recent one (by created_at)
            if (!screeningMap[key] || 
                new Date(row.created_at || row.initial_screening_date || 0) > 
                new Date(screeningMap[key].created_at || screeningMap[key].initial_screening_date || 0)) {
              screeningMap[key] = row;
            }
          }
        });
        console.log(`✅ Found ${screeningData.length} screening records for ${Object.keys(screeningMap).length} students${year ? ` (year: ${year})` : ''}`);
      }
    }

    // Transform data - start with students, join with screening_results
    const transformedData = studentsData.map((student, index) => {
      // Get screening data for this student (may be null if not screened)
      const screeningRow = screeningMap[student.unique_id] || null;
      
      // If date filters are applied and student has no screening in date range, they won't appear
      // But we want to show them as "not started" - so we include them anyway
      
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
        // Screening data - null if not screened yet
        initial_screening_date: screeningRow?.initial_screening_date || null,
        was_absent: screeningRow?.was_absent ?? false,
        glasses_or_contacts: screeningRow?.vision_initial_glasses || screeningRow?.vision_rescreen_glasses || null,
        status_override: screeningRow?.status_override || null, // Manual status override
        // Vision - using correct field names (null if not screened)
        vision_required: screeningRow?.vision_required ?? false,
        vision_complete: screeningRow?.vision_complete ?? false,
        vision_initial_right: screeningRow?.vision_initial_right_eye ?? null,
        vision_initial_left: screeningRow?.vision_initial_left_eye ?? null,
        vision_rescreen_right: screeningRow?.vision_rescreen_right_eye ?? null,
        vision_rescreen_left: screeningRow?.vision_rescreen_left_eye ?? null,
        // Hearing - all 12 frequency columns (1k, 2k, 4k for right/left, initial/rescreen)
        hearing_required: screeningRow?.hearing_required ?? false,
        hearing_complete: screeningRow?.hearing_complete ?? false,
        // Initial Right
        hearing_initial_right_1000: screeningRow?.hearing_initial_right_1000 ?? null,
        hearing_initial_right_2000: screeningRow?.hearing_initial_right_2000 ?? null,
        hearing_initial_right_4000: screeningRow?.hearing_initial_right_4000 ?? null,
        // Initial Left
        hearing_initial_left_1000: screeningRow?.hearing_initial_left_1000 ?? null,
        hearing_initial_left_2000: screeningRow?.hearing_initial_left_2000 ?? null,
        hearing_initial_left_4000: screeningRow?.hearing_initial_left_4000 ?? null,
        // Rescreen Right
        hearing_rescreen_right_1000: screeningRow?.hearing_rescreen_right_1000 ?? null,
        hearing_rescreen_right_2000: screeningRow?.hearing_rescreen_right_2000 ?? null,
        hearing_rescreen_right_4000: screeningRow?.hearing_rescreen_right_4000 ?? null,
        // Rescreen Left
        hearing_rescreen_left_1000: screeningRow?.hearing_rescreen_left_1000 ?? null,
        hearing_rescreen_left_2000: screeningRow?.hearing_rescreen_left_2000 ?? null,
        hearing_rescreen_left_4000: screeningRow?.hearing_rescreen_left_4000 ?? null,
        // Acanthosis - using correct field names
        acanthosis_required: screeningRow?.acanthosis_required ?? false,
        acanthosis_complete: screeningRow?.acanthosis_complete ?? false,
        acanthosis_initial: screeningRow?.acanthosis_initial_result ?? null,
        acanthosis_rescreen: screeningRow?.acanthosis_rescreen_result ?? null,
        // Scoliosis - using correct field names
        scoliosis_required: screeningRow?.scoliosis_required ?? false,
        scoliosis_complete: screeningRow?.scoliosis_complete ?? false,
        scoliosis_initial: screeningRow?.scoliosis_initial_result ?? null,
        scoliosis_rescreen: screeningRow?.scoliosis_rescreen_result ?? null,
      };
    });

    // Apply additional filters that couldn't be done in query
    let filteredData = transformedData;
    if (grade) {
      const grades = grade.split(',');
      filteredData = filteredData.filter(row => grades.includes(row.grade));
    }
    if (gender) {
      const genders = gender.split(',');
      filteredData = filteredData.filter(row => genders.includes(row.gender));
    }
    if (status) {
      filteredData = filteredData.filter(row => {
        if (status === 'completed') {
          return (!row.vision_required || row.vision_complete) &&
                 (!row.hearing_required || row.hearing_complete) &&
                 (!row.acanthosis_required || row.acanthosis_complete) &&
                 (!row.scoliosis_required || row.scoliosis_complete) &&
                 !row.was_absent;
        }
        if (status === 'incomplete') {
          return !row.was_absent && (
            (row.vision_required && !row.vision_complete) ||
            (row.hearing_required && !row.hearing_complete) ||
            (row.acanthosis_required && !row.acanthosis_complete) ||
            (row.scoliosis_required && !row.scoliosis_complete)
          );
        }
        if (status === 'failed') {
          // Check if any test result is "F"
          return row.vision_initial_right === 'F' || row.vision_initial_left === 'F' ||
                 row.vision_rescreen_right === 'F' || row.vision_rescreen_left === 'F' ||
                 row.hearing_initial_right === 'F' || row.hearing_initial_left === 'F' ||
                 row.hearing_rescreen_right === 'F' || row.hearing_rescreen_left === 'F' ||
                 row.acanthosis_initial === 'F' || row.acanthosis_rescreen === 'F' ||
                 row.scoliosis_initial === 'F' || row.scoliosis_rescreen === 'F';
        }
        if (status === 'absent') {
          return row.was_absent;
        }
        return true;
      });
    }

    // Log sample data structure for debugging
    if (filteredData.length > 0) {
      const sample = filteredData[0];
      console.log('📊 Sample transformed record:');
      console.log(`   Student: ${sample.first_name} ${sample.last_name} (${sample.grade}), unique_id: ${sample.unique_id}`);
      console.log(`   Vision: R=${sample.vision_initial_right}, L=${sample.vision_initial_left}, Required=${sample.vision_required}, Complete=${sample.vision_complete}`);
      console.log(`   Hearing 1k: R=${sample.hearing_initial_right_1000}, L=${sample.hearing_initial_left_1000}`);
      console.log(`   Hearing 2k: R=${sample.hearing_initial_right_2000}, L=${sample.hearing_initial_left_2000}`);
      console.log(`   Hearing 4k: R=${sample.hearing_initial_right_4000}, L=${sample.hearing_initial_left_4000}`);
      console.log(`   AN: ${sample.acanthosis_initial}, Required=${sample.acanthosis_required}, Complete=${sample.acanthosis_complete}`);
      console.log(`   Spinal: ${sample.scoliosis_initial}, Required=${sample.scoliosis_required}, Complete=${sample.scoliosis_complete}`);
    }

    res.json({
      data: filteredData,
      total: count || filteredData.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    next(error);
  }
});

// Update screening data and/or student data
router.put('/:unique_id', async (req, res, next) => {
  try {
    const { unique_id } = req.params;
    const updateData = { ...req.body }; // Create a copy to avoid mutating the original

    // Separate student data from screening data (check before deleting)
    const studentDataFields = {};
    if (updateData.first_name !== undefined) studentDataFields.first_name = updateData.first_name;
    if (updateData.last_name !== undefined) studentDataFields.last_name = updateData.last_name;
    if (updateData.grade !== undefined) studentDataFields.grade = updateData.grade;
    if (updateData.gender !== undefined) studentDataFields.gender = updateData.gender;
    if (updateData.dob !== undefined) studentDataFields.dob = updateData.dob;
    if (updateData.school !== undefined) studentDataFields.school = updateData.school;
    if (updateData.teacher !== undefined) studentDataFields.teacher = updateData.teacher;
    if (updateData.status !== undefined) studentDataFields.status = updateData.status;
    if (updateData.unique_id !== undefined) studentDataFields.unique_id = updateData.unique_id;
    if (updateData.notes !== undefined) studentDataFields.notes = updateData.notes;

    // Remove student metadata fields from updateData for screening_results
    delete updateData.student_id;
    delete updateData.unique_id;
    delete updateData.first_name;
    delete updateData.last_name;
    delete updateData.grade;
    delete updateData.gender;
    delete updateData.dob;
    delete updateData.school;
    delete updateData.teacher;
    delete updateData.status;
    delete updateData.notes;

    // Map frontend field names to database column names
    const fieldMapping = {
      // Screening metadata
      'initial_screening_date': 'initial_screening_date',
      'was_absent': 'was_absent',
      'glasses_or_contacts': null, // This is derived from vision_initial_glasses or vision_rescreen_glasses
      'status_override': 'status_override', // Manual status override
      // Vision
      'vision_required': 'vision_required',
      'vision_complete': 'vision_complete',
      'vision_initial_right': 'vision_initial_right_eye',
      'vision_initial_left': 'vision_initial_left_eye',
      'vision_rescreen_right': 'vision_rescreen_right_eye',
      'vision_rescreen_left': 'vision_rescreen_left_eye',
      // Hearing - all 12 frequency fields
      'hearing_required': 'hearing_required',
      'hearing_complete': 'hearing_complete',
      'hearing_initial_right_1000': 'hearing_initial_right_1000',
      'hearing_initial_right_2000': 'hearing_initial_right_2000',
      'hearing_initial_right_4000': 'hearing_initial_right_4000',
      'hearing_initial_left_1000': 'hearing_initial_left_1000',
      'hearing_initial_left_2000': 'hearing_initial_left_2000',
      'hearing_initial_left_4000': 'hearing_initial_left_4000',
      'hearing_rescreen_right_1000': 'hearing_rescreen_right_1000',
      'hearing_rescreen_right_2000': 'hearing_rescreen_right_2000',
      'hearing_rescreen_right_4000': 'hearing_rescreen_right_4000',
      'hearing_rescreen_left_1000': 'hearing_rescreen_left_1000',
      'hearing_rescreen_left_2000': 'hearing_rescreen_left_2000',
      'hearing_rescreen_left_4000': 'hearing_rescreen_left_4000',
      // Acanthosis
      'acanthosis_required': 'acanthosis_required',
      'acanthosis_complete': 'acanthosis_complete',
      'acanthosis_initial': 'acanthosis_initial_result',
      'acanthosis_rescreen': 'acanthosis_rescreen_result',
      // Scoliosis
      'scoliosis_required': 'scoliosis_required',
      'scoliosis_complete': 'scoliosis_complete',
      'scoliosis_initial': 'scoliosis_initial_result',
      'scoliosis_rescreen': 'scoliosis_rescreen_result'
    };

    // Map and filter update data
    const filteredData = {};
    for (const [frontendKey, dbKey] of Object.entries(fieldMapping)) {
      if (updateData.hasOwnProperty(frontendKey) && dbKey !== null) {
        filteredData[dbKey] = updateData[frontendKey];
      }
    }

    // Handle glasses_or_contacts - update vision_initial_glasses if provided
    if (updateData.hasOwnProperty('glasses_or_contacts')) {
      filteredData['vision_initial_glasses'] = updateData.glasses_or_contacts;
    }

    // studentDataFields already filtered, use it directly
    const studentUpdateData = studentDataFields;

    // Update students table if there are student data fields to update
    if (Object.keys(studentUpdateData).length > 0) {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .update(studentUpdateData)
        .eq('unique_id', unique_id)
        .select()
        .single();

      if (studentError) {
        console.error('Error updating student:', studentError);
        throw studentError;
      }

      if (!studentData) {
        return res.status(404).json({ error: 'Student record not found' });
      }
    }

    // Update screening_results table if there are screening data fields to update
    let screeningData = null;
    if (Object.keys(filteredData).length > 0) {
      const { data, error } = await supabase
        .from('screening_results')
        .update(filteredData)
        .eq('unique_id', unique_id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({ error: 'Screening record not found' });
      }

      screeningData = data;
    }

    // If no updates were made, return error
    if (Object.keys(filteredData).length === 0 && Object.keys(studentUpdateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    res.json({ 
      success: true, 
      screeningData: screeningData,
      studentData: Object.keys(studentUpdateData).length > 0 ? 'updated' : null
    });

  } catch (error) {
    next(error);
  }
});

export default router;

