import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { BASE_PATH_FRONT_END } from './utils/constants';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token');
  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') ||
    request.nextUrl.pathname.startsWith('/otp-verification') ||
    request.nextUrl.pathname.startsWith('/forgot-password');

  // If user is not authenticated and trying to access protected route
  console.log("pathname", request.nextUrl.pathname);
  if (!authToken && !isAuthPage) {
    return NextResponse.redirect(new URL(`${BASE_PATH_FRONT_END}/signin`, request.url));
  }

  // If user is authenticated and trying to access auth pages
  if (authToken && isAuthPage) {
    return NextResponse.redirect(new URL(`${BASE_PATH_FRONT_END}/dashboard`, request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}