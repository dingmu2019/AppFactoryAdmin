import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ACTIONS = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];
const RESOURCES = ['users', 'settings', 'reports', 'orders', 'products', 'api_keys'];
const STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILURE']; // 75% success rate

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedAuditLogs() {
  console.log('🌱 Seeding audit logs...');

  try {
    // 1. Fetch Apps
    const { data: apps, error: appsError } = await supabase.from('saas_apps').select('id, name');
    if (appsError) throw new Error(`Failed to fetch apps: ${appsError.message}`);
    
    if (!apps || apps.length === 0) {
        console.log('⚠️ No apps found. Please run seed-apps.ts first.');
        return;
    }

    // 2. Fetch Users (We need at least one user to attribute logs to)
    const { data: users, error: usersError } = await supabase.from('users').select('id, email, full_name');
    // If public.users is empty, we might need to fallback to auth users or just use null
    let validUsers = users || [];
    
    if (validUsers.length === 0) {
        console.log('⚠️ No users found in public.users. Using null user_id for logs.');
    }

    const logsToInsert = [];
    const TOTAL_LOGS = 50;

    for (let i = 0; i < TOTAL_LOGS; i++) {
        const app = getRandomItem(apps);
        const user = validUsers.length > 0 ? getRandomItem(validUsers) : null;
        const action = getRandomItem(ACTIONS);
        const status = getRandomItem(STATUSES);
        
        // Random date within last 7 days
        const date = new Date();
        date.setDate(date.getDate() - getRandomInt(0, 7));
        date.setHours(getRandomInt(0, 23), getRandomInt(0, 59), getRandomInt(0, 59));
        
        logsToInsert.push({
            app_id: app.id,
            user_id: user?.id || null,
            user_email: user?.email || 'unknown@example.com',
            action: action,
            resource: getRandomItem(RESOURCES),
            details: {
                message: `${action} operation on ${app.name}`,
                path: `/api/${getRandomItem(RESOURCES)}`,
                params: { id: getRandomInt(1000, 9999) }
            },
            ip_address: `192.168.1.${getRandomInt(1, 255)}`,
            user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            status: status,
            created_at: date.toISOString()
        });
    }

    // 3. Insert Logs
    // We try to insert with app_id. If it fails, we might need to alter table or retry without app_id
    const { error } = await supabase.from('audit_logs').insert(logsToInsert);

    if (error) {
        console.error('❌ Failed to insert logs:', error);
        if (error.message.includes('column "app_id" of relation "audit_logs" does not exist')) {
             console.log('💡 Suggestion: The audit_logs table is missing app_id column. You may need to add it.');
             // Attempt to fix? No, better to inform user or fix via SQL if possible.
             // I can try to run a raw SQL to add the column if I had a way, but I don't via supabase-js client directly (RPC needed).
             // However, I can create a migration file and ask user to run it, or just use details.
        }
    } else {
        console.log(`✅ Successfully inserted ${logsToInsert.length} audit logs.`);
    }

  } catch (e) {
    console.error('❌ Unexpected error:', e);
  }
}

seedAuditLogs();
