import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get all active schools
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) throw error;
    
    res.json({ schools: data });
    
  } catch (error) {
    next(error);
  }
});

export default router;

