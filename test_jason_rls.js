const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'leace.lee@gmail.com',
    password: 'password123!' // Assuming password is correct
  });

  if (signInError) {
    console.error('SignIn Error:', signInError);
    return;
  }
  console.log('Jason signed in:', session.user.id);

  const { data, error } = await supabase.from('todos').select('id, title, user_id, assignee_ids');
  console.log('Todos length:', data ? data.length : 0);
  console.log('Error:', error);
  console.log('Todos:', JSON.stringify(data, null, 2));
}
test();
