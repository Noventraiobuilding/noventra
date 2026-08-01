import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yafncpfkjmealuwmvcgc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4uogckOVNwIrH72gbNlSxg_ywvZ1BE1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
