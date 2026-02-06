import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  const headersList = headers();
  // Get IP from various headers that might be present in different environments
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  
  // Parse x-forwarded-for which might be a comma separated list
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || 'unknown';
  
  return NextResponse.json({ ip });
}
