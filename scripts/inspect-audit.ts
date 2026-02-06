import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspect() {
  console.log('🔍 Inspecting audit_logs table...');
  
  // Try to select just one row to see structure (if any data exists)
  // Or just insert a minimal row to see what fails
  
  const { data, error } = await supabase.from('audit_logs').select('*').limit(1);
  
  if (error) {
    console.error('Select error:', error);
  } else {
    console.log('Data sample:', data);
    if (data.length === 0) {
        console.log('Table is empty. Trying to insert a dummy row to check columns...');
        // Try inserting with minimal known columns
        const { error: insertError } = await supabase.from('audit_logs').insert([{
            action: 'TEST',
            resource: 'test'
        }]);
        console.log('Insert minimal result:', insertError || 'Success');
    }
  }
}

inspect();
