const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const userId = '402adaf2-3620-4db7-a8a3-4dc04af41e37'; // Jason Albon
  const { data, error } = await supabase
    .from('todos')
    .select('id, title, user_id, assignee_id, assignee_ids')
    .or(`user_id.eq.${userId},assignee_id.eq.${userId},assignee_ids.cs.{${userId}}`)
    .limit(1);
    
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
