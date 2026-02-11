import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables (works in Vite, Next.js, and standard Node envs)
const getEnvVar = (key: string) => {
  try {
    // Check for Vite's import.meta.env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const val = import.meta.env[key] || import.meta.env[`VITE_${key}`];
      if (val) return val;
    }
  } catch (e) { /* ignore */ }

  try {
    // Check for Node's process.env
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`VITE_${key}`];
    }
  } catch (e) { /* ignore */ }

  return '';
};

// Fallback values to prevent crash during initialization if env vars are missing
const supabaseUrl = getEnvVar('SUPABASE_URL') || 'https://yudnboezoqseovjvtiyf.supabase.co';
const supabaseKey = getEnvVar('SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ib2V6b3FzZW92anZ0aXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTgwNTIsImV4cCI6MjA4NTY5NDA1Mn0.CO3vywcJtTVs9PKAe1i2navw07Kuih0pLS4UXQ3ABAY';

if (supabaseUrl === 'https://yudnboezoqseovjvtiyf.supabase.co') {
  console.warn('Supabase URL is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
