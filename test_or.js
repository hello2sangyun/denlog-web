const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('todos')
    .select('id, title, assignee_ids')
    .or('assignee_ids.cs.{test-id}')
    .limit(1);
    
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
