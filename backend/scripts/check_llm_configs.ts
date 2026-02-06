import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConfigs() {
  console.log('Checking integration_configs...');
  
  const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('category', 'llm');
      
  if (error) {
      console.error('Error fetching configs:', error);
      return;
  }
  
  console.log('Configs found:', data?.length);
  data?.forEach(c => {
      console.log(`- ID: ${c.id}`);
      console.log(`  Provider: ${c.config.provider}`);
      console.log(`  Model: ${c.config.model}`);
      console.log(`  Enabled: ${c.is_enabled}`);
      console.log(`  API Key: ${c.config.apiKey ? '******' + c.config.apiKey.slice(-4) : 'MISSING'}`);
      console.log(`  Base URL: ${c.config.baseUrl || c.config.endpoint || 'DEFAULT'}`);
  });

  console.log('\nChecking Environment Variables:');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Unset');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Unset');
}

checkConfigs();
