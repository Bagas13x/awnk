import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://imajmorxmfbknkyqtswt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWptb3J4bWZia25reXF0c3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjQ1NTMsImV4cCI6MjA3MTc0MDU1M30.Pd4CKuXcMIVJZdPLAflG2KNrqKkc_BiaYZg5D4OZH3c'

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log(supabase);
