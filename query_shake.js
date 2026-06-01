require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('todos').select('*').ilike('title', '%흔들기%');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
