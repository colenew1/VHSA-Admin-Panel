import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get all admin users (with optional active filter)
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;
    
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
    const { name, phone_number, active = true, admin = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Format phone number if provided (add +1 if it's a 10-digit US number)
    let formattedPhone = phone_number;
    if (phone_number && phone_number.trim()) {
      // Remove all non-digits
      const digits = phone_number.replace(/\D/g, '');
      // If it's 10 digits, add +1
      if (digits.length === 10) {
        formattedPhone = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        formattedPhone = `+${digits}`;
      } else if (!phone_number.startsWith('+')) {
        formattedPhone = phone_number; // Keep as-is if it doesn't start with +
      }
    } else {
      formattedPhone = null; // Allow null phone numbers
    }
    
    // Check if phone number already exists (if provided)
    if (formattedPhone) {
      const { data: existing, error: checkError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('phone_number', formattedPhone)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existing) {
        return res.status(400).json({ error: 'Phone number already exists' });
      }
    }
    
    // Insert new admin user
    const { data: adminUser, error: insertError } = await supabase
      .from('admin_users')
      .insert({ 
        name: name.trim(), 
        phone_number: formattedPhone,
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
    const { name, phone_number, active, admin } = req.body;
    
    console.log('Update admin user request:', { id, name, phone_number, active, body: req.body });
    
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
    
    // Format phone number if provided
    let formattedPhone = phone_number;
    if (phone_number && phone_number.trim()) {
      // Remove all non-digits
      const digits = phone_number.replace(/\D/g, '');
      // If it's 10 digits, add +1
      if (digits.length === 10) {
        formattedPhone = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        formattedPhone = `+${digits}`;
      } else if (!phone_number.startsWith('+')) {
        formattedPhone = phone_number;
      }
    } else {
      formattedPhone = null; // Allow null phone numbers
    }
    
    // Check if phone number is already used by another user (if provided)
    if (formattedPhone) {
      const { data: phoneConflict, error: phoneError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('phone_number', formattedPhone)
        .neq('id', id)
        .maybeSingle();
      
      if (phoneError && phoneError.code !== 'PGRST116') {
        throw phoneError;
      }
      
      if (phoneConflict) {
        return res.status(400).json({ error: 'Phone number already in use by another user' });
      }
    }
    
    // Update admin user
    const updateData = {
      name: name.trim(),
      phone_number: formattedPhone,
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

