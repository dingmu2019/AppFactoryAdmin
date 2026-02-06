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

const TARGET_USER = {
  email: '517709151@qq.com',
  password: 'password123', // Default password
  name: 'Admin User',
  role: 'admin',
  region: {
    country: 'CN',
    province: 'Beijing',
    city: 'Beijing'
  }
};

async function initUser() {
  console.log(`🌱 Initializing user: ${TARGET_USER.email}...`);

  try {
    // Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list users:', listError);
      return;
    }

    const existingUser = users.find(u => u.email === TARGET_USER.email);

    if (existingUser) {
      console.log(`ℹ️  User ${TARGET_USER.email} already exists. Updating metadata...`);
      
      const { data, error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            full_name: TARGET_USER.name,
            role: TARGET_USER.role,
            region: TARGET_USER.region
          }
        }
      );

      if (error) {
        console.error('❌ Failed to update user:', error);
      } else {
        console.log('✅ User updated successfully.');
        // Note: Updating metadata in Auth might not trigger the public.users update if the trigger is only ON INSERT.
        // We should manually update public.users just in case.
        
        const { error: profileError } = await supabase
          .from('users')
          .update({
            full_name: TARGET_USER.name,
            roles: [TARGET_USER.role],
            region: TARGET_USER.region
          })
          .eq('id', existingUser.id);

        if (profileError) {
             console.error('❌ Failed to update public profile:', profileError);
        } else {
             console.log('✅ Public profile updated successfully.');
        }
      }

    } else {
      // Create new user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: TARGET_USER.email,
        password: TARGET_USER.password,
        email_confirm: true,
        user_metadata: {
          full_name: TARGET_USER.name,
          role: TARGET_USER.role,
          region: TARGET_USER.region
        }
      });

      if (authError) {
        console.error(`❌ Failed to create user: ${authError.message}`);
      } else {
        console.log(`✅ Created user: ${TARGET_USER.email} (${authUser.user.id})`);
      }
    }

  } catch (e) {
    console.error(`❌ Unexpected error:`, e);
  }

  console.log('✨ Initialization completed!');
}

initUser();
