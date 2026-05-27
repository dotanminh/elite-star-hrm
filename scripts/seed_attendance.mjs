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

  console.log('Fetching employees...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role');

  if (profileError) {
    console.error('Failed to fetch profiles:', profileError.message);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} employees.`);

  console.log('Clearing existing attendance logs...');
  const { error: deleteError } = await supabase
    .from('attendance_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (deleteError) {
    console.error('Failed to clear logs:', deleteError.message);
  }

  const startDate = new Date('2026-04-29');
  const endDate = new Date('2026-05-27');
  
  const logsToInsert = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Check in 06:00 sáng, Check out 21:30 tối (giờ Việt Nam +07:00)
    for (const profile of profiles) {
      logsToInsert.push({
        employee_id: profile.id,
        work_date: dateStr,
        check_in: `${dateStr}T06:00:00+07:00`,
        check_out: `${dateStr}T21:30:00+07:00`,
        status: 'present'
      });
    }
  }

  console.log(`Inserting ${logsToInsert.length} attendance records...`);
  
  // Insert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < logsToInsert.length; i += batchSize) {
    const batch = logsToInsert.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('attendance_logs')
      .upsert(batch, { onConflict: 'employee_id, work_date' });

    if (insertError) {
      console.error(`Error inserting batch ${i}:`, insertError.message);
    } else {
      console.log(`Inserted batch ${i} to ${i + batch.length}`);
    }
  }

  console.log('Done!');
}

main();
