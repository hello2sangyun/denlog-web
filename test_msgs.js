require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.log('No supabase url in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: users, error: err1 } = await supabase.from('users').select('id, display_name').limit(2);
  console.log('Users:', users);
  
  if (!users || users.length < 2) return;
  
  const user1 = users[0].id;
  const user2 = users[1].id;
  
  const { data: msgs, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`);
    
  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Success! Count:', msgs.length);
  }
}

test();
