import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1] || request.cookies.get('token')?.value;

  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname.startsWith('/api/login') || pathname.startsWith('/api/register') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token (simplified for middleware)
  // In a real production app, you might want to use jose for edge-compatible JWT verification
  // But for now, we'll assume the token exists and is valid, and handle verification in API routes
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
