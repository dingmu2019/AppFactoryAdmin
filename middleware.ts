
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // TODO: Fix Supabase Middleware Client import issue
  // const supabase = createMiddlewareClient({ req, res });
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // API Authentication
  // if (req.nextUrl.pathname.startsWith('/api/admin')) {
  //   if (!session) {
  //     return NextResponse.json(
  //       { error: 'Unauthorized: Please login first' },
  //       { status: 401 }
  //     );
  //   }
  // }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth|public|.well-known).*)',
  ],
};
