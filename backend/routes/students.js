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

export default router;

