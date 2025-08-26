import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://imajmorxmfbknkyqtswt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWptb3J4bWZia25reXF0c3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjQ1NTMsImV4cCI6MjA3MTc0MDU1M30.Pd4CKuXcMIVJZdPLAflG2KNrqKkc_BiaYZg5D4OZH3c'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // Since you're not using authentication
  }
})

// Optional: Add error handling wrapper
export const handleSupabaseError = (error, operation) => {
  if (error) {
    console.error(`Supabase ${operation} error:`, error)
    throw new Error(`Database operation failed: ${error.message}`)
  }
}

// Optional: Health check function
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select('count(*)')
      .limit(1)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Supabase connection failed:', error)
    return false
  }
}