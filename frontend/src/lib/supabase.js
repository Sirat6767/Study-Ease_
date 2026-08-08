import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zrlbnoelnwkepabxefgm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpybGJub2VsbndrZXBhYnhlZmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTY0MjMsImV4cCI6MjA5MjY5MjQyM30.6pju6TZPtTeiPCgDILBZ5x5ehsaXkW7TMCXv8MC-v9o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
