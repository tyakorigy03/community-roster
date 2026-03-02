import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://lyuhhztaemndephpgjaj.supabase.co';
const supabaseAnonKey ='sb_publishable_b8EbWoStq8gMi3GmW9UZlA_fkwYOW-T';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
