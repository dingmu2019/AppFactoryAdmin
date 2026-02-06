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
  console.error('Error: Missing env vars');
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

async function resetAndSeed() {
  console.log('🧹 Cleaning up existing users...');
  
  // 1. List users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
      console.error('Error listing users:', listError);
      return;
  }

  // 2. Delete users
  for (const u of users) {
    // Check if this user is in our mock list (optional, but safer to just clean all for dev)
    // For now, let's delete all to ensure clean slate
    const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
    if (delError) {
        console.warn(`Failed to delete ${u.email}:`, delError.message);
    } else {
        console.log(`Deleted: ${u.email}`);
    }
  }

  console.log('🌱 Seeding new users...');

  for (const user of MOCK_USERS) {
    try {
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
        console.warn(`⚠️  Failed to create ${user.email}: ${authError.message}`);
      } else if (authUser.user) {
        console.log(`✅ Created: ${user.email}`);
      }
    } catch (e) {
      console.error(`❌ Unexpected error for ${user.email}:`, e);
    }
  }

  console.log('✨ Reset and Seed completed!');
}

resetAndSeed();
