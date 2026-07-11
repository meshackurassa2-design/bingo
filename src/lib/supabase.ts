import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://jdvyllyukevkokqarkjl.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdnlsbHl1a2V2a29rcWFya2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDQzNzcsImV4cCI6MjA5OTI4MDM3N30.PALpIqyOH2-4T_xl8CuMHr3oK19ozT9kSbZKMxMYNaM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
