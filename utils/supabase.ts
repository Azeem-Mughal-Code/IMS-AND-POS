import { createClient } from '@supabase/supabase-js';

// These variables are expected to be available in the environment.
// In a local development or testing environment, they might be sourced from a .env file,
// but in the production environment they are injected.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

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
