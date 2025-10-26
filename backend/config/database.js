import { createClient } from '@supabase/supabase-js';

// Lazy initialization - only create client when actually used
let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured. Check your .env file.');
    }
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log('✓ Supabase client initialized');
  }
  return supabaseClient;
}

// Export as default for backwards compatibility
export const supabase = new Proxy({}, {
  get(target, prop) {
    return getSupabase()[prop];
  }
});

