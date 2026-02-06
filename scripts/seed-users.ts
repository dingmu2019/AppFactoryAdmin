import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires Service Role Key for Admin operations

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('Please get your Service Role Key from Supabase Dashboard > Project Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const MOCK_USERS = [
  { email: 'admin@example.com', password: 'password123', name: 'Admin User', role: 'admin' },
  { email: 'john.doe@example.com', password: 'password123', name: 'John Doe', role: 'user' },
  { email: 'jane.smith@example.com', password: 'password123', name: 'Jane Smith', role: 'editor' },
  { email: 'bob.wilson@example.com', password: 'password123', name: 'Bob Wilson', role: 'viewer' },
  { email: 'alice.brown@example.com', password: 'password123', name: 'Alice Brown', role: 'user' },
  { email: 'david.lee@example.com', password: 'password123', name: 'David Lee', role: 'user' },
  { email: 'sarah.jones@example.com', password: 'password123', name: 'Sarah Jones', role: 'editor' },
  { email: 'mike.chen@example.com', password: 'password123', name: 'Mike Chen', role: 'user' },
  { email: 'emily.davis@example.com', password: 'password123', name: 'Emily Davis', role: 'viewer' },
  { email: 'tom.white@example.com', password: 'password123', name: 'Tom White', role: 'user' },
];

async function seedUsers() {
  console.log('🌱 Starting user seeding...');

  for (const user of MOCK_USERS) {
    try {
      // 1. Create User in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.name,
          role: user.role
        }
      });

      if (authError) {
        console.warn(`⚠️  Failed to create auth user ${user.email}: ${authError.message}`);
        continue;
      }

      if (authUser.user) {
        console.log(`✅ Created user: ${user.email} (${authUser.user.id})`);
        
        // Note: The Trigger in schema.sql should automatically handle insertion into public.users
        // But if we want to ensure or update additional fields, we can do it here:
        /*
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: authUser.user.id,
            email: user.email,
            full_name: user.name,
            role: user.role,
            status: 'active'
          });
        */
      }

    } catch (e) {
      console.error(`❌ Unexpected error for ${user.email}:`, e);
    }
  }

  console.log('✨ Seeding completed!');
}

seedUsers();
