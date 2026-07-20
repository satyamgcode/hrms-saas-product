import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xzbroorkbybtfjfzpkfs.supabase.co';
const supabaseKey = 'sb_publishable_35FO2q-KFt2EfTubBh_ICA_sK_0LeH6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
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
