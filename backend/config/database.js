import { createClient } from '@supabase/supabase-js';

// Lazy initialization - only create client when actually used
let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    // Check if credentials are missing or still have placeholder values
    if (!url || !key ||
        url.includes('your_supabase') ||
        key.includes('your_supabase')) {
      throw new Error(
        'Supabase credentials not configured properly.\n' +
        'Please update SUPABASE_URL and SUPABASE_ANON_KEY in your .env file with real values.\n' +
        'Get your credentials from: https://app.supabase.com/project/_/settings/api'
      );
    }

    supabaseClient = createClient(url, key);
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

