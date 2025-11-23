import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/database.js';

const router = express.Router();

// Create Supabase client for auth (uses ANON_KEY for auth operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Request OTP via SMS - Check database first
router.post('/request-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Format phone number (must include country code, e.g., +1234567890)
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone}`;
    
    // Check if phone number exists in admin_users database
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('id, phone_number, name, role, active')
      .eq('phone_number', formattedPhone)
      .single();
    
    if (dbError || !adminUser) {
      console.log('❌ Unauthorized login attempt:', formattedPhone);
      return res.status(403).json({ 
        error: 'Phone number not authorized. Please contact administrator.' 
      });
    }
    
    // Check if user is active
    if (!adminUser.active) {
      console.log('❌ Inactive account login attempt:', formattedPhone);
      return res.status(403).json({ 
        error: 'Your account has been deactivated. Please contact administrator.' 
      });
    }
    
    // Phone is authorized - send OTP via Supabase
    console.log('📱 Sending OTP to authorized user:', adminUser.name, formattedPhone);
    const { data, error } = await supabaseAuth.auth.signInWithOtp({
      phone: formattedPhone,
    });
    
    if (error) {
      console.error('❌ Error sending OTP:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ 
      success: true, 
      message: 'OTP sent to your phone',
      // Optionally return user info (without sensitive data)
      user: {
        name: adminUser.name,
        role: adminUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, token } = req.body;
    
    if (!phone || !token) {
      return res.status(400).json({ error: 'Phone number and OTP token are required' });
    }
    
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone}`;
    
    // Verify OTP with Supabase
    const { data, error } = await supabaseAuth.auth.verifyOtp({
      phone: formattedPhone,
      token: token,
      type: 'sms',
    });
    
    if (error) {
      console.error('❌ OTP verification failed:', error);
      return res.status(400).json({ error: error.message || 'Invalid OTP' });
    }
    
    // Get admin user info from database
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, phone_number, name, role, active')
      .eq('phone_number', formattedPhone)
      .single();
    
    console.log('✅ User authenticated:', adminUser?.name, formattedPhone);
    
    // Return session + user info
    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
      user: {
        id: adminUser?.id,
        phone: formattedPhone,
        name: adminUser?.name,
        role: adminUser?.role,
        supabase_user_id: data.user?.id
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user info (protected route)
router.get('/me', async (req, res, next) => {
  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Get admin user info from database
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, phone_number, name, role, active')
      .eq('phone_number', user.phone)
      .single();
    
    if (!adminUser || !adminUser.active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }
    
    res.json({
      user: {
        id: adminUser.id,
        phone: user.phone,
        name: adminUser.name,
        role: adminUser.role,
        supabase_user_id: user.id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout (optional - mainly for frontend to clear tokens)
router.post('/logout', async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;

