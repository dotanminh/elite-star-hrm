import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
      process.env[key] = val;
    }
  });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration in .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

const TABLES = [
  'departments',
  'titles',
  'profiles',
  'disciplinary_records',
  'leave_requests',
  'attendance_logs',
  'payslips'
];

async function exportBackup() {
  console.log("Starting Supabase database backup process...");

  try {
    // Authenticate as Admin to bypass RLS policies
    console.log("Authenticating as Admin (dotanminh@gmail.com)...");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'dotanminh@gmail.com',
      password: 'Minh@2310'
    });

    if (authErr) {
      console.error("Authentication failed! Cannot backup due to RLS limits:", authErr.message);
      process.exit(1);
    }
    
    console.log("Successfully authenticated as Admin!");
    const backupData = {};

    for (const table of TABLES) {
      console.log(`Fetching data from table: ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) {
        console.warn(`Warning: Failed to fetch table ${table}:`, error.message);
        backupData[table] = [];
      } else {
        console.log(`Successfully fetched ${data ? data.length : 0} rows from ${table}.`);
        backupData[table] = data || [];
      }
    }

    // Define backups directory
    const backupsDir = path.join(process.cwd(), 'supabase', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Generate filename with current local date
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `backup_${dateStr}_live.json`;
    const outputPath = path.join(backupsDir, filename);

    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log("\n=============================================");
    console.log(`SUCCESS: Database backup saved to:`);
    console.log(outputPath);
    console.log("=============================================\n");
  } catch (err) {
    console.error("Error during database backup export:", err);
  }
}

exportBackup();
