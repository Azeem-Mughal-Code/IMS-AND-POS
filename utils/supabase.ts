import { createClient } from '@supabase/supabase-js';

// Supabase credentials.
const supabaseUrl = 'https://byhimfheodcxrihelmrz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aGltZmhlb2RjeHJpaGVsbXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTMxNjgsImV4cCI6MjA3ODg2OTE2OH0.GTS7ErzJ21aY6709v-3JLq47s7cgFNzDmiK0g2o5BdA';

if (!supabaseUrl || !supabaseAnonKey) {
    // A simple visual error for developers if the environment variables are missing.
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
                <h1 style="color: #ef4444;">Configuration Error</h1>
                <p style="color: #4b5563;">Supabase URL and Anon Key are missing.</p>
                <p style="color: #6b7280; font-size: 0.875rem;">Please ensure SUPABASE_URL and SUPABASE_ANON_KEY environment variables are set.</p>
            </div>
        `;
    }
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
