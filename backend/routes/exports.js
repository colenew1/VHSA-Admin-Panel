import express from 'express';
import { supabase } from '../config/database.js';

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

// Export stickers
router.get('/stickers', async (req, res, next) => {
  try {
    const { school } = req.query;
    
    if (!school || school === 'all') {
      return res.status(400).json({ error: 'School is required for sticker export' });
    }
    
    const { data, error } = await supabase
      .from('sticker_labels')
      .select('*')
      .eq('school', school);
    
    if (error) throw error;
    
    const csv = convertToCSV(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="stickers-${school}.csv"`);
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
      return `"${value !== null && value !== undefined ? value : ''}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export default router;

