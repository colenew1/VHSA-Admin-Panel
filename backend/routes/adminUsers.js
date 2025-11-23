import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get all admin users (with optional active filter)
router.get('/', async (req, res, next) => {
  try {
    const { active, search } = req.query;
    
    let query = supabase
      .from('admin_users')
      .select('*')
      .order('name');
    
    // If active='all', return all users (no filter)
    // If active filter is specified (true/false), apply it
    // If not specified, default to active=true for backward compatibility
    if (active === 'all') {
      // Don't filter - return all users
    } else if (active !== undefined) {
      query = query.eq('active', active === 'true');
    } else {
      // Default to active users for backward compatibility
      query = query.eq('active', true);
    }
    
    // Search by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ adminUsers: data });
    
  } catch (error) {
    next(error);
  }
});

// Create new admin user
router.post('/', async (req, res, next) => {
  try {
    const { name, email, active = true, admin = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Normalize email (lowercase, trim, or null)
    let normalizedEmail = null;
    if (email && email.trim()) {
      normalizedEmail = email.toLowerCase().trim();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    // Check if email already exists (if provided)
    if (normalizedEmail) {
      const { data: existing, error: checkError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existing) {
        return res.status(400).json({ error: 'Email address already exists' });
      }
    }
    
    // Insert new admin user
    const { data: adminUser, error: insertError } = await supabase
      .from('admin_users')
      .insert({ 
        name: name.trim(), 
        email: normalizedEmail,
        active,
        admin
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    res.status(201).json({
      adminUser: adminUser,
      message: 'Admin user created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Update admin user
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, active, admin } = req.body;
    
    console.log('Update admin user request:', { id, name, email, active, body: req.body });
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Check if user exists
    const { data: existing, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      throw checkError;
    }
    
    // Normalize email (lowercase, trim, or null)
    let normalizedEmail = null;
    if (email && email.trim()) {
      normalizedEmail = email.toLowerCase().trim();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    // Check if email is already used by another user (if provided)
    if (normalizedEmail) {
      const { data: emailConflict, error: emailError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', normalizedEmail)
        .neq('id', id)
        .maybeSingle();
      
      if (emailError && emailError.code !== 'PGRST116') {
        throw emailError;
      }
      
      if (emailConflict) {
        return res.status(400).json({ error: 'Email address already in use by another user' });
      }
    }
    
    // Update admin user
    const updateData = {
      name: name.trim(),
      email: normalizedEmail,
      active: active !== undefined ? active : existing.active,
      admin: admin !== undefined ? admin : existing.admin,
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    res.json({
      adminUser: updatedUser,
      message: 'Admin user updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Delete admin user
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const { data: existing, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      throw checkError;
    }
    
    // Delete the user
    const { error: deleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    res.json({
      message: 'Admin user deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;
