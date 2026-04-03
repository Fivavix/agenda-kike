import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xggoywmrzyoxqvvplvgz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t0dYxxnE3Wkf3JglFL5lZQ_fwW0p126';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
