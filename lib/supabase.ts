import { createClient } from '@supabase/supabase-js';

// Fallback values to prevent crash during initialization if env vars are missing
const supabaseUrl = process.env.SUPABASE_URL || 'https://yudnboezoqseovjvtiyf.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ib2V6b3FzZW92anZ0aXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTgwNTIsImV4cCI6MjA4NTY5NDA1Mn0.CO3vywcJtTVs9PKAe1i2navw07Kuih0pLS4UXQ3ABAY';

if (supabaseUrl === 'https://yudnboezoqseovjvtiyf.supabase.co') {
  console.warn('Supabase URL is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);