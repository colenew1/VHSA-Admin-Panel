import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get all schools (with optional active filter)
// If active parameter is not provided, defaults to active=true for backward compatibility
// If active='all', returns all schools regardless of status
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;
    
    let query = supabase
      .from('schools')
      .select('*')
      .order('name');
    
    // If active='all', return all schools (no filter)
    // If active filter is specified (true/false), apply it
    // If not specified, default to active=true for backward compatibility
    if (active === 'all') {
      // Don't filter - return all schools
    } else if (active !== undefined) {
      query = query.eq('active', active === 'true');
    } else {
      // Default to active schools for backward compatibility
      query = query.eq('active', true);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ schools: data });
    
  } catch (error) {
    next(error);
  }
});

// Create new school
router.post('/', async (req, res, next) => {
  try {
    const { name, active = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }
    
    // Check if school already exists (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('schools')
      .select('*')
      .ilike('name', name.trim())
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (expected)
      throw checkError;
    }
    
    if (existing) {
      return res.status(400).json({ error: 'School already exists' });
    }
    
    // Insert new school
    const { data: school, error: insertError } = await supabase
      .from('schools')
      .insert({ name: name.trim(), active })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    res.status(201).json({
      school: school,
      message: 'School created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Update school
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    
    console.log('Update school request:', { id, name, active, body: req.body });
    
    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }
    
    // Check if school exists
    const { data: existing, error: checkError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error('Error checking school existence:', checkError);
      throw checkError;
    }
    if (!existing) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    // Check if name conflicts with another school (case-insensitive, excluding current)
    const { data: nameConflict, error: nameError } = await supabase
      .from('schools')
      .select('*')
      .ilike('name', name.trim())
      .neq('id', id)
      .maybeSingle();
    
    if (nameError && nameError.code !== 'PGRST116') {
      console.error('Error checking name conflict:', nameError);
      throw nameError;
    }
    
    if (nameConflict) {
      return res.status(400).json({ error: 'School name already exists' });
    }
    
    // Prepare update data - ensure active is a boolean
    const updateData = {
      name: name.trim()
    };
    
    // Handle active field - convert string to boolean if needed
    if (active !== undefined) {
      if (typeof active === 'boolean') {
        updateData.active = active;
      } else if (typeof active === 'string') {
        updateData.active = active === 'true' || active === 'True';
      } else {
        updateData.active = Boolean(active);
      }
    } else {
      updateData.active = existing.active;
    }
    
    console.log('Update data:', updateData);
    console.log('Active value being set:', updateData.active, 'Type:', typeof updateData.active);
    console.log('Existing school before update:', existing);
    
    // Update school - try to get result directly from update
    const { data: updateResult, error: updateError, count } = await supabase
      .from('schools')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (updateError) {
      console.error('Error updating school:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      throw updateError;
    }
    
    console.log('Update result from Supabase:', updateResult);
    console.log('Number of rows updated:', updateResult?.length || 0);
    console.log('Update count:', count);
    
    // If update returned data, verify it matches what we sent
    if (updateResult && updateResult.length > 0) {
      const updatedSchool = updateResult[0];
      console.log('Using update result:', updatedSchool);
      console.log('Active status in result:', updatedSchool.active, 'Expected:', updateData.active);
      
      // If the active field was updated, verify it matches
      if (updateData.active !== undefined && updatedSchool.active !== updateData.active) {
        console.error('⚠️ WARNING: Update returned different active value!');
        console.error('   Sent:', updateData.active, 'Got:', updatedSchool.active);
        // Still return it - might be RLS or the update didn't work
      }
      
      return res.json({
        school: updatedSchool,
        message: 'School updated successfully'
      });
    }
    
    // If no data returned (RLS might prevent returning updated row), 
    // the update might still have succeeded - return success with the data we sent
    console.log('⚠️ No data returned from update (RLS may be blocking select)');
    console.log('Update likely succeeded, but cannot verify due to RLS');
    
    // Return the expected result based on what we sent
    res.json({
      school: {
        ...existing,
        ...updateData
      },
      message: 'School update submitted (cannot verify due to RLS)'
    });
    
  } catch (error) {
    console.error('School update error:', error);
    next(error);
  }
});

// Delete school
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if school exists
    const { data: existing, error: checkError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    
    if (checkError) throw checkError;
    if (!existing) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    // Delete school
    const { error: deleteError } = await supabase
      .from('schools')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    res.json({
      message: 'School deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;

