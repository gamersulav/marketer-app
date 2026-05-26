import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'marketer-secret-change-me');
const COOKIE = 'marketer_session';
const PUBLIC = ['/login', '/api/auth/login', '/api/auth/setup', '/order', '/api/order'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE)?.value;
  if (!cookie) return NextResponse.redirect(new URL('/login', req.url));

  try {
    await jwtVerify(decodeURIComponent(cookie), SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
