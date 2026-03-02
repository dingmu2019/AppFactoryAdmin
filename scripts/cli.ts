
import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const APP_KEY = process.env.APP_KEY || 'admin-sys-app-key'; // Default or from env
const APP_SECRET = process.env.APP_SECRET || 'admin-sys-app-secret'; // Default or from env

// Helper to sign requests (Native Node.js Crypto)
function signRequest(method: string, urlPath: string, body: any, timestamp: string, nonce: string, secret: string) {
  const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
  
  // Normalize path (ensure starts with / and no base URL)
  let cleanPath = urlPath;
  if (cleanPath.startsWith('http')) {
    try {
      const u = new URL(cleanPath);
      cleanPath = u.pathname + u.search;
    } catch { }
  }
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

  const rawString = `${method.toUpperCase()}${cleanPath}${timestamp}${nonce}${bodyStr}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawString);
  return hmac.digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
AdminSys Generic CLI Tool
Usage: npx tsx scripts/cli.ts <METHOD> <PATH> [JSON_BODY]

Examples:
  npx tsx scripts/cli.ts GET /api/admin/users
  npx tsx scripts/cli.ts POST /api/admin/users '{"email":"test@example.com"}'
  npx tsx scripts/cli.ts GET /api/admin/users?page=1
`);
    process.exit(0);
  }

  const method = args[0].toUpperCase();
  const urlPath = args[1];
  const bodyRaw = args[2];

  let data = undefined;
  if (bodyRaw) {
    try {
      data = JSON.parse(bodyRaw);
    } catch (e) {
      console.error('Error parsing JSON body:', e);
      process.exit(1);
    }
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(8).toString('hex');
  const signature = signRequest(method, urlPath, data, timestamp, nonce, APP_SECRET);

  console.log(`Sending ${method} request to ${BASE_URL}${urlPath}...`);

  try {
    const config: AxiosRequestConfig = {
      method,
      url: `${BASE_URL}${urlPath}`,
      headers: {
        'Content-Type': 'application/json',
        'x-app-key': APP_KEY,
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature,
        // Also support Bearer token if provided in env
        ...(process.env.ACCESS_TOKEN ? { 'Authorization': `Bearer ${process.env.ACCESS_TOKEN}` } : {})
      },
      data,
      validateStatus: () => true // Don't throw on error status
    };

    const response = await axios(config);

    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    console.log('Headers:', response.headers);
    console.log('Body:');
    console.dir(response.data, { depth: null, colors: true });

  } catch (error: any) {
    console.error('Request Failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

main();
