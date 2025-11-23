import express from 'express';
import { supabase } from '../config/database.js';
import { areAllRequiredTestsComplete } from '../utils/completionHelpers.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { school = 'all', startDate, endDate } = req.query;
    
    console.log('📊 Dashboard query:', { school, startDate, endDate });
    
    // Build query - fetch ALL field values needed to calculate completion
    let query = supabase
      .from('screening_results')
      .select(`
        student_id,
        student_school,
        was_absent,
        vision_required,
        hearing_required,
        acanthosis_required,
        scoliosis_required,
        initial_screening_date,
        vision_initial_right_eye,
        vision_initial_left_eye,
        vision_rescreen_right_eye,
        vision_rescreen_left_eye,
        hearing_initial_right_1000,
        hearing_initial_right_2000,
        hearing_initial_right_4000,
        hearing_initial_left_1000,
        hearing_initial_left_2000,
        hearing_initial_left_4000,
        hearing_rescreen_right_1000,
        hearing_rescreen_right_2000,
        hearing_rescreen_right_4000,
        hearing_rescreen_left_1000,
        hearing_rescreen_left_2000,
        hearing_rescreen_left_4000,
        acanthosis_initial_result,
        acanthosis_rescreen_result,
        scoliosis_initial_result,
        scoliosis_rescreen_result
      `);
    
    if (startDate) query = query.gte('initial_screening_date', startDate);
    if (endDate) query = query.lte('initial_screening_date', endDate);
    if (school !== 'all') query = query.eq('student_school', school);
    
    const { data: results, error } = await query;
    
    console.log('📊 Dashboard results:', { 
      count: results?.length || 0, 
      error: error?.message,
      sample: results?.slice(0, 2)
    });
    
    if (error) throw error;
    
    // Process results
    const stats = {
      totalStudents: results.length,
      completed: 0,
      incomplete: 0,
      absent: 0,
      bySchool: {}
    };
    
    results.forEach(student => {
      // Count absent
      if (student.was_absent) {
        stats.absent++;
        return;
      }
      
      // Calculate completion status based on actual field values
      const allComplete = areAllRequiredTestsComplete(student);
      
      if (allComplete) {
        stats.completed++;
      } else {
        stats.incomplete++;
      }
      
      // Group by school
      const schoolName = student.student_school;
      if (!stats.bySchool[schoolName]) {
        stats.bySchool[schoolName] = {
          school: schoolName,
          total: 0,
          completed: 0,
          incomplete: 0,
          absent: 0
        };
      }
      
      stats.bySchool[schoolName].total++;
      if (student.was_absent) {
        stats.bySchool[schoolName].absent++;
      } else if (allComplete) {
        stats.bySchool[schoolName].completed++;
      } else {
        stats.bySchool[schoolName].incomplete++;
      }
    });
    
    // Calculate completion rate
    const nonAbsent = stats.totalStudents - stats.absent;
    stats.completionRate = nonAbsent > 0 
      ? Math.round((stats.completed / nonAbsent) * 100) 
      : 0;
    
    // Convert bySchool to array
    stats.bySchool = Object.values(stats.bySchool).map(school => ({
      ...school,
      completionRate: school.total - school.absent > 0
        ? Math.round((school.completed / (school.total - school.absent)) * 100)
        : 0
    }));
    
    res.json({
      dateRange: { start: startDate, end: endDate },
      overall: {
        totalStudents: stats.totalStudents,
        completed: stats.completed,
        incomplete: stats.incomplete,
        absent: stats.absent,
        completionRate: stats.completionRate
      },
      bySchool: stats.bySchool,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;

