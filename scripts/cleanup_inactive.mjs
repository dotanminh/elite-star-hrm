import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Logging in as Admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'toiminhvuive@gmail.com',
    password: 'password123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    process.exit(1);
  }

  console.log('Fetching inactive employees...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, status')
    .eq('status', 'inactive');

  if (profileError) {
    console.error('Failed to fetch inactive profiles:', profileError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('No inactive employees found.');
    process.exit(0);
  }

  console.log(`Found ${profiles.length} inactive employees:`, profiles.map(p => `${p.last_name} ${p.first_name}`).join(', '));
  
  const ids = profiles.map(p => p.id);
  
  console.log('Deleting attendance logs for these employees...');
  const { error: deleteError, count } = await supabase
    .from('attendance_logs')
    .delete()
    .in('employee_id', ids);

  if (deleteError) {
    console.error('Failed to clear logs:', deleteError.message);
  } else {
    console.log('Successfully deleted logs for inactive employees.');
  }

  console.log('Done!');
}

main();
