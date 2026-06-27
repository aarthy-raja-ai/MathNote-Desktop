import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;

    const url = localStorage.getItem('SUPABASE_URL') || '';
    const key = localStorage.getItem('SUPABASE_KEY') || '';

    if (url && key) {
        console.log('[Supabase] Initializing client dynamically...');
        supabaseInstance = createClient(url, key);
        return supabaseInstance;
    }
    return null;
};

export const resetSupabaseClient = () => {
    supabaseInstance = null;
    console.log('[Supabase] Client reset.');
};

export const isSyncEnabled = () => !!getSupabaseClient();

