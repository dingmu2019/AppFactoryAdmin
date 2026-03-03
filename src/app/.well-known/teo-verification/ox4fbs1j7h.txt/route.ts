import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('9eu615rnwh9d72tb29n55rv0yfn4omu5', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
