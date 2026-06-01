import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: 'leace.lee@gmail.com',
    password: 'password123' // Or use service role key if needed
  });
  
  if (!session) {
    console.error("No session, please use service_role key to bypass RLS");
  }
}
test();
