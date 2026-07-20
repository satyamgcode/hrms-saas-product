import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xzbroorkbybtfjfzpkfs.supabase.co';
const supabaseKey = 'sb_publishable_35FO2q-KFt2EfTubBh_ICA_sK_0LeH6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'temp_check_' + Math.floor(Math.random() * 100000) + '@example.com';
  const password = 'TempPassword123!';

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error('Sign up failed:', authError);
    return;
  }

  console.log('Authenticated!');
  const { data: users, error: usersErr } = await supabase.from('users').select('id, name, email, companyId, role');
  if (usersErr) {
    console.error(usersErr);
    return;
  }

  console.log('Total users in public.users:', users.length);
  const byCompany = {};
  users.forEach(u => {
    byCompany[u.companyId] = (byCompany[u.companyId] || 0) + 1;
  });
  console.log('Users count by companyId:', byCompany);

  console.log('Users belonging to companyId = 1:');
  const comp1Users = users.filter(u => u.companyId === 1);
  console.log(comp1Users);
}

main();
