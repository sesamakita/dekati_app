// services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jaqvxcnrqodumydeqlao.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphcXZ4Y25ycW9kdW15ZGVxbGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NDQ2ODUsImV4cCI6MjEwNTQyMDY4NX0.mwQ82XT2oz4NQAld6RuXaOBiePydEFaooOq8s7_ZMEo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
