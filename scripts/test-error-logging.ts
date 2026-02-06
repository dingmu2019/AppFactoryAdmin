import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function verifyErrorLogging() {
  const API_URL = 'http://localhost:3001';

  console.log('🧪 Triggering test error via API...');
  
  try {
    const res = await fetch(`${API_URL}/api/debug/test-error`);
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Body:', data);
    
    if (res.status === 500 && data.error) {
        console.log('✅ API returned 500 Error as expected.');
    } else {
        console.log('❌ Unexpected API response.');
    }

  } catch (e) {
    console.error('❌ API request failed:', e);
  }

  // Check Database
  console.log('\n🔍 Checking system_error_logs table...');
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Wait a bit for async logging
  await new Promise(r => setTimeout(r, 2000));

  const { data: logs, error } = await supabase
    .from('system_error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ DB Query failed:', error);
  } else if (logs && logs.length > 0) {
    const log = logs[0];
    console.log('✅ Found latest error log:');
    console.log(`   ID: ${log.id}`);
    console.log(`   Message: ${log.message}`);
    console.log(`   Path: ${log.path}`);
    
    if (log.message.includes('test system error triggered manually')) {
        console.log('🎉 SUCCESS: The manually triggered error was logged!');
    } else {
        console.log('⚠️ Found a log, but maybe not the one we just triggered?');
    }
  } else {
    console.log('❌ No logs found in system_error_logs table.');
  }
}

verifyErrorLogging();
