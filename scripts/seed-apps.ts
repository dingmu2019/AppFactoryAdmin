import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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

const TARGET_ADMIN_EMAIL = '517709151@qq.com';

const APPS_TO_SEED = [
  { name: 'AdminSys_app', description: '后台管理Web App' },
  { name: 'lottery_app', description: '企业摇奖Web App' },
  { name: 'OmniDebate_app', description: '多智能体模拟讨论Web App' }
];

const generateCredentials = () => {
  const apiKey = 'pk_' + crypto.randomBytes(16).toString('hex');
  const apiSecret = 'sk_' + crypto.randomBytes(24).toString('hex');
  return { apiKey, apiSecret };
};

async function seedApps() {
  console.log('🌱 Starting apps seeding...');

  try {
    // 1. Get Owner ID (Admin User)
    // We query the auth.users via admin api, or public.users
    // Since we have service role, we can query public.users directly which is easier if mapped
    // But to be safe let's use admin auth api to find the user we just created
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error(`Failed to list users: ${userError.message}`);
    }

    const adminUser = users.find(u => u.email === TARGET_ADMIN_EMAIL);
    const ownerId = adminUser?.id;

    if (!ownerId) {
        console.warn(`⚠️  Admin user ${TARGET_ADMIN_EMAIL} not found. Apps will be created without an owner.`);
    } else {
        console.log(`👤 Found owner: ${TARGET_ADMIN_EMAIL} (${ownerId})`);
    }

    // 2. Process each app
    for (const app of APPS_TO_SEED) {
        // Check if exists
        const { data: existing } = await supabase
            .from('saas_apps')
            .select('id, name')
            .eq('name', app.name)
            .single();

        if (existing) {
            console.log(`ℹ️  App already exists: ${app.name} (${existing.id})`);
            
            // Optional: Update description or owner if needed
            const { error: updateError } = await supabase
                .from('saas_apps')
                .update({ 
                    description: app.description,
                    owner_id: ownerId 
                })
                .eq('id', existing.id);
            
            if (updateError) console.error(`   ❌ Failed to update info: ${updateError.message}`);
            
            continue;
        }

        // Create new
        const { apiKey, apiSecret } = generateCredentials();
        const { data: newApp, error: createError } = await supabase
            .from('saas_apps')
            .insert([{
                name: app.name,
                description: app.description,
                status: 'Active',
                api_key: apiKey,
                api_secret: apiSecret,
                owner_id: ownerId
            }])
            .select()
            .single();

        if (createError) {
            console.error(`❌ Failed to create ${app.name}: ${createError.message}`);
        } else {
            console.log(`✅ Created app: ${newApp.name} (${newApp.id})`);
            console.log(`   🔑 API Key: ${apiKey}`);
        }
    }

  } catch (e) {
    console.error('❌ Unexpected error:', e);
  }

  console.log('✨ Apps seeding completed!');
}

seedApps();
