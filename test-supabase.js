const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://ibqowntzmfniiyglsabz.supabase.co', 'sb_publishable_LECLRgdGcJ6sadVNsz5S_A_FTqnYazL');

async function test() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'app://-',
    }
  });
  console.log("DATA:", data);
  console.log("ERROR:", error);
}

test();
