
import { supabaseAdmin } from './src/lib/supabase';

async function checkTables() {
  const tables = [
    'notification_channels',
    'notification_providers',
    'notification_routes',
    'notification_templates',
    'notification_messages',
    'notification_logs'
  ];

  for (const table of tables) {
    const { error } = await supabaseAdmin.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.error(`Table ${table} error:`, error.message);
    } else {
      console.log(`Table ${table} exists.`);
    }
  }
}

checkTables();
