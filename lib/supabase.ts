import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL_ALT ?? '', process.env.NEXT_PUBLIC_SUPABASE_KEY_ALT ?? '');

export default supabase;
