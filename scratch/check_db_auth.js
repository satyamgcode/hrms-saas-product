import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xzbroorkbybtfjfzpkfs.supabase.co';
const supabaseKey = 'sb_publishable_35FO2q-KFt2EfTubBh_ICA_sK_0LeH6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'temp_check_' + Math.floor(Math.random() * 100000) + '@example.com';
  const password = 'TempPassword123!';

  console.log('Signing up temporary user:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error('Sign up failed:', authError);
    return;
  }

  const session = authData.session;
  if (!session) {
    console.log('No session returned. Trying to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Sign in failed:', signInError);
      return;
    }
    // Set active session
    supabase.auth.setSession(signInData.session);
  }

  console.log('Authenticated! Fetching users...');
  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  console.log('USERS IN DB (count:', users?.length, '):');
  if (usersErr) console.error(usersErr);
  else console.log(users);

  const { data: companies, error: companiesErr } = await supabase.from('companies').select('*');
  console.log('COMPANIES IN DB:');
  if (companiesErr) console.error(companiesErr);
  else console.log(companies);
}

main();
