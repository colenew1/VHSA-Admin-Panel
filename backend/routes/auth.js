import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/database.js';

const router = express.Router();

// Create Supabase client for auth (uses ANON_KEY for auth operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Request magic link via email - Check database first
router.post('/request-magic-link', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 Received email:', email, '→ Normalized:', normalizedEmail);
    
    // Check if email exists in admin_users database
    // Use maybeSingle() - returns null data (not error) when no record found
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('id, email, name, admin, active')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    // Log the query result for debugging
    console.log('🔍 Database query result:', {
      found: !!adminUser,
      hasError: !!dbError,
      errorCode: dbError?.code,
      errorMessage: dbError?.message,
      email: normalizedEmail,
      adminUser: adminUser ? { id: adminUser.id, name: adminUser.name, email: adminUser.email, active: adminUser.active } : null
    });
    
    // If there's an actual database error (connection, RLS, etc.)
    if (dbError) {
      console.error('❌ Database error:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      return res.status(500).json({ 
        error: 'Database error. Please try again.' 
      });
    }
    
    // If no user found (maybeSingle returns null data, no error)
    if (!adminUser) {
      console.log('❌ Unauthorized login attempt - email not found:', normalizedEmail);
      
      // Debug: Check what emails exist in the database
      const { data: allEmails, error: debugError } = await supabase
        .from('admin_users')
        .select('email, name')
        .not('email', 'is', null);
      
      if (debugError) {
        console.error('❌ Error fetching email list:', debugError);
      } else {
        console.log('📋 Available emails in database:', allEmails?.map(u => `${u.name}: ${u.email}`).join(', ') || 'none');
      }
      
      return res.status(403).json({ 
        error: 'Email address not authorized. Please contact administrator.' 
      });
    }
    
    // Check if user is active
    if (!adminUser.active) {
      console.log('❌ Inactive account login attempt:', normalizedEmail, adminUser.name);
      return res.status(403).json({ 
        error: 'Your account has been deactivated. Please contact administrator.' 
      });
    }
    
    // Check if user is an admin (only admins can access admin panel)
    if (!adminUser.admin) {
      console.log('❌ Non-admin login attempt:', normalizedEmail, adminUser.name);
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }
    
    // Email is authorized - send magic link via Supabase
    // The redirect URL should point to the backend callback endpoint
    // IMPORTANT: This URL must also be whitelisted in Supabase Dashboard:
    // Authentication → URL Configuration → Redirect URLs
    const backendUrl = process.env.BACKEND_URL || 
                       (process.env.NODE_ENV === 'production' 
                         ? process.env.RENDER_EXTERNAL_URL || 'https://vhsa-admin-panel-backend.onrender.com'
                         : `${req.protocol}://${req.get('host')}`);
    const redirectTo = req.body.redirectTo || `${backendUrl}/api/auth/callback`;
    
    console.log('🔗 Magic link redirect URL:', redirectTo);
    console.log('   Make sure this URL is whitelisted in Supabase Dashboard → Authentication → URL Configuration');
    
    console.log('📧 Sending magic link to authorized user:', adminUser.name, normalizedEmail);
    const { data, error } = await supabaseAuth.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    
    if (error) {
      console.error('❌ Error sending magic link:', error);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      return res.status(400).json({ 
        error: error.message || 'Failed to send magic link. Please check your email address and try again.' 
      });
    }
    
    console.log('✅ Magic link request successful. Supabase response:', {
      message: data?.message,
      hasData: !!data,
    });
    
    res.json({ 
      success: true, 
      message: 'Magic link sent to your email. Please check your inbox.',
      // Optionally return user info (without sensitive data)
      user: {
        name: adminUser.name,
        admin: adminUser.admin
      }
    });
  } catch (error) {
    console.error('❌ Unexpected error in request-magic-link:', error);
    next(error);
  }
});

// Handle magic link callback (when user clicks the link in email)
router.get('/callback', async (req, res, next) => {
  try {
    const { token_hash, type, email } = req.query;
    
    if (type === 'email' && token_hash) {
      // Verify the token from the magic link
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        token_hash,
        type: 'email',
      });
      
      if (error) {
        console.error('❌ Magic link verification failed:', error);
        return res.redirect(`/?error=${encodeURIComponent(error.message)}`);
      }
      
      if (data.session && data.user) {
        // Get admin user info from database
        const normalizedEmail = email?.toLowerCase().trim();
        const { data: adminUser, error: callbackError } = await supabase
          .from('admin_users')
          .select('id, email, name, admin, active')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (callbackError) {
          console.error('❌ Error fetching user in callback:', callbackError);
          return res.redirect(`/?error=${encodeURIComponent('Database error')}`);
        }
        
        if (adminUser && adminUser.active && adminUser.admin) {
          console.log('✅ Admin user authenticated via magic link:', adminUser.name, normalizedEmail);
          
          // Redirect to frontend with session tokens
          // Frontend will extract tokens from URL and store them
          const frontendUrl = process.env.FRONTEND_URL || 
                              (process.env.NODE_ENV === 'production'
                                ? 'https://vhsa-admin-panel.netlify.app'
                                : 'http://localhost:5173');
          const redirectUrl = new URL('/auth/callback', frontendUrl);
          console.log('🔗 Redirecting to frontend:', redirectUrl.toString());
          redirectUrl.searchParams.set('access_token', data.session.access_token);
          redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);
          redirectUrl.searchParams.set('expires_at', data.session.expires_at);
          
          return res.redirect(redirectUrl.toString());
        } else {
          return res.redirect(`/?error=${encodeURIComponent('Access denied. Admin privileges required.')}`);
        }
      }
    }
    
    return res.redirect(`/?error=${encodeURIComponent('Invalid magic link')}`);
  } catch (error) {
    console.error('❌ Error in magic link callback:', error);
    return res.redirect(`/?error=${encodeURIComponent('Authentication error')}`);
  }
});

// Verify session from frontend (after magic link redirect)
router.post('/verify-session', async (req, res, next) => {
  try {
    const { access_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    
    // Verify token and get user
    const { data: { user }, error } = await supabaseAuth.auth.getUser(access_token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Get admin user info from database
    const normalizedEmail = user.email?.toLowerCase().trim();
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, email, name, admin, active')
      .eq('email', normalizedEmail)
      .single();
    
    if (!adminUser || !adminUser.active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }
    
    console.log('✅ Session verified for user:', adminUser.name, normalizedEmail);
    
    // Get full session
    const { data: { session } } = await supabaseAuth.auth.getSession();
    
    res.json({
      success: true,
      session: {
        access_token: access_token,
        refresh_token: session?.refresh_token,
        expires_at: session?.expires_at,
        expires_in: session?.expires_in,
      },
      user: {
        id: adminUser.id,
        email: normalizedEmail,
        name: adminUser.name,
        admin: adminUser.admin,
        supabase_user_id: user.id
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
    const normalizedEmail = user.email?.toLowerCase().trim();
    const { data: adminUser, error: meError } = await supabase
      .from('admin_users')
      .select('id, email, name, admin, active')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (meError) {
      console.error('❌ Error fetching user in /me:', meError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!adminUser || !adminUser.active || !adminUser.admin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    res.json({
      user: {
        id: adminUser.id,
        email: user.email,
        name: adminUser.name,
        admin: adminUser.admin,
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
