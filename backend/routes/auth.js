import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/database.js';

const router = express.Router();

// Create Supabase client for auth (uses ANON_KEY for auth operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to normalize phone number
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // If it doesn't start with +, add +1 for US numbers
  if (!cleaned.startsWith('+')) {
    // Remove leading 1 if present (US country code)
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    cleaned = `+1${cleaned}`;
  }
  return cleaned;
}

// Request OTP via SMS - Check database first
router.post('/request-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Normalize phone number (remove formatting, ensure +1XXXXXXXXXX format)
    const formattedPhone = normalizePhoneNumber(phone);
    console.log('📞 Received phone:', phone, '→ Formatted:', formattedPhone);
    
    // Check if phone number exists in admin_users database
    // Try exact match first
    let { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('id, phone_number, name, role, active')
      .eq('phone_number', formattedPhone)
      .single();
    
    let allUsers = null;
    
    // If not found, try to find by normalizing database phone numbers
    if (dbError || !adminUser) {
      console.log('⚠️  Exact match not found, checking all admin users...');
      const { data: allUsersData, error: allUsersError } = await supabase
        .from('admin_users')
        .select('id, phone_number, name, role, active');
      
      if (!allUsersError && allUsersData) {
        allUsers = allUsersData;
        // Find user by normalizing their phone numbers
        adminUser = allUsers.find(user => {
          if (!user.phone_number) return false;
          const normalized = normalizePhoneNumber(user.phone_number);
          return normalized === formattedPhone;
        });
        
        if (adminUser) {
          console.log('✅ Found user by normalized phone:', adminUser.name);
        }
      }
    }
    
    if (!adminUser) {
      console.log('❌ Unauthorized login attempt:', formattedPhone);
      if (allUsers) {
        console.log('   Available phone numbers in database:', 
          allUsers.map(u => `${u.name}: ${u.phone_number || 'NULL'}`).join(', '));
      }
      return res.status(403).json({ 
        error: 'Phone number not authorized. Please contact administrator.' 
      });
    }
    
    // Check if user is active
    if (!adminUser.active) {
      console.log('❌ Inactive account login attempt:', formattedPhone, adminUser.name);
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
      console.error('   Error details:', JSON.stringify(error, null, 2));
      return res.status(400).json({ 
        error: error.message || 'Failed to send OTP. Please check your phone number and try again.' 
      });
    }
    
    console.log('✅ OTP request successful. Supabase response:', {
      message: data?.message,
      hasData: !!data,
      hasUser: !!data?.user
    });
    
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
    console.error('❌ Unexpected error in request-otp:', error);
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
    
    const formattedPhone = normalizePhoneNumber(phone);
    console.log('🔐 Verifying OTP for phone:', formattedPhone);
    
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

