import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get all screeners (with optional active filter)
// If active parameter is not provided, returns all screeners
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;
    
    let query = supabase
      .from('screeners')
      .select('*')
      .order('name');
    
    // If active filter is specified, apply it
    if (active !== undefined) {
      query = query.eq('active', active === 'true');
    }
    // If not specified, return all (both active and inactive)
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ screeners: data });
    
  } catch (error) {
    next(error);
  }
});

// Create new screener
router.post('/', async (req, res, next) => {
  try {
    const { name, active = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Screener name is required' });
    }
    
    // Check if screener already exists (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('screeners')
      .select('*')
      .ilike('name', name.trim())
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (expected)
      throw checkError;
    }
    
    if (existing) {
      return res.status(400).json({ error: 'Screener already exists' });
    }
    
    // Insert new screener
    const { data: screener, error: insertError } = await supabase
      .from('screeners')
      .insert({ name: name.trim(), active })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    res.status(201).json({
      screener: screener,
      message: 'Screener created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Update screener
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Screener name is required' });
    }
    
    // Check if screener exists
    const { data: existing, error: checkError } = await supabase
      .from('screeners')
      .select('*')
      .eq('id', id)
      .single();
    
    if (checkError) throw checkError;
    if (!existing) {
      return res.status(404).json({ error: 'Screener not found' });
    }
    
    // Check if name conflicts with another screener (case-insensitive, excluding current)
    const { data: nameConflict, error: nameError } = await supabase
      .from('screeners')
      .select('*')
      .ilike('name', name.trim())
      .neq('id', id)
      .maybeSingle();
    
    if (nameError && nameError.code !== 'PGRST116') {
      throw nameError;
    }
    
    if (nameConflict) {
      return res.status(400).json({ error: 'Screener name already exists' });
    }
    
    // Update screener
    const { data: screener, error: updateError } = await supabase
      .from('screeners')
      .update({ 
        name: name.trim(), 
        active: active !== undefined ? active : existing.active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    res.json({
      screener: screener,
      message: 'Screener updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Delete screener
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if screener exists
    const { data: existing, error: checkError } = await supabase
      .from('screeners')
      .select('*')
      .eq('id', id)
      .single();
    
    if (checkError) throw checkError;
    if (!existing) {
      return res.status(404).json({ error: 'Screener not found' });
    }
    
    // Delete screener
    const { error: deleteError } = await supabase
      .from('screeners')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    res.json({
      message: 'Screener deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;

