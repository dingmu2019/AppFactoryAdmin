
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('--- Config Check ---')
console.log('URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('Anon Key:', supabaseAnonKey ? 'Set' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing')

if (supabaseAnonKey === supabaseServiceKey) {
  console.warn('\n[WARNING] SUPABASE_SERVICE_ROLE_KEY is identical to NEXT_PUBLIC_SUPABASE_ANON_KEY!')
  console.warn('This means your backend APIs will NOT have admin privileges and will fail RLS checks.')
  console.warn('Please update .env.local with the correct service_role key from Supabase Dashboard > Project Settings > API.')
}

async function testConnection() {
  console.log('\n--- Testing Connection (Anon Key) ---')
  const client = createClient(supabaseUrl!, supabaseAnonKey!)
  const { data, error } = await client.from('users').select('count', { count: 'exact', head: true })
  
  if (error) {
    console.error('Anon Connection Failed:', error.message)
  } else {
    console.log('Anon Connection Success. Users count (RLS restricted):', data)
  }

  if (supabaseServiceKey && supabaseServiceKey !== supabaseAnonKey) {
    console.log('\n--- Testing Connection (Service Key) ---')
    const adminClient = createClient(supabaseUrl!, supabaseServiceKey)
    const { data: adminData, error: adminError } = await adminClient.from('users').select('count', { count: 'exact', head: true })
    if (adminError) {
      console.error('Admin Connection Failed:', adminError.message)
    } else {
      console.log('Admin Connection Success. Total Users:', adminData)
    }
  } else {
    console.log('\n[Skipping Admin Test] No valid Service Key provided.')
  }
}

testConnection()
