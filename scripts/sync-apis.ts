
import { ApiSyncService } from '../src/services/apiSyncService';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for DB connection
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  console.log('🚀 Starting API Sync...');
  try {
    const result = await ApiSyncService.sync();
    if (result.success) {
      console.log(`✅ API Sync completed successfully! Found ${result.count} APIs.`);
    } else {
      console.error('❌ API Sync failed:', result.error);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('💥 Unexpected error during API sync:', err.message);
    process.exit(1);
  }
}

run();
