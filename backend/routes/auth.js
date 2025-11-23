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
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('id, email, name, role, active')
      .eq('email', normalizedEmail)
      .single();
    
    if (dbError || !adminUser) {
      console.log('❌ Unauthorized login attempt:', normalizedEmail);
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
    
    // Email is authorized - send magic link via Supabase
    // Get the redirect URL from request or use default
    // The redirect URL should point to the backend callback endpoint
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const redirectTo = req.body.redirectTo || `${backendUrl}/api/auth/callback`;
    
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
        role: adminUser.role
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
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, email, name, role, active')
          .eq('email', normalizedEmail)
          .single();
        
        if (adminUser && adminUser.active) {
          console.log('✅ User authenticated via magic link:', adminUser.name, normalizedEmail);
          
          // Redirect to frontend with session tokens
          // Frontend will extract tokens from URL and store them
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const redirectUrl = new URL('/auth/callback', frontendUrl);
          redirectUrl.searchParams.set('access_token', data.session.access_token);
          redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);
          redirectUrl.searchParams.set('expires_at', data.session.expires_at);
          
          return res.redirect(redirectUrl.toString());
        } else {
          return res.redirect(`/?error=${encodeURIComponent('User not found or inactive')}`);
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
      .select('id, email, name, role, active')
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
        role: adminUser.role,
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
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, email, name, role, active')
      .eq('email', normalizedEmail)
      .single();
    
    if (!adminUser || !adminUser.active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }
    
    res.json({
      user: {
        id: adminUser.id,
        email: user.email,
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
