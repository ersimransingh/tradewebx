import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { BASE_PATH_FRONT_END } from './utils/constants';
import { SECURITY_CONFIG, isAllowedHttpHost, getSecurityHeaders, getHstsHeader } from './utils/securityConfig';

// Helper function to check if development mode is enabled
function isDevelopmentMode(): boolean {
    return process.env.NEXT_DEVELOPMENT_MODE === 'true';
}

export function middleware(request: NextRequest) {
    // Security: Force HTTPS in production (allow localhost and testing URLs)
    // Skip HTTPS enforcement if development mode is enabled
    if (!isDevelopmentMode() && SECURITY_CONFIG.FORCE_HTTPS && request.headers.get('x-forwarded-proto') !== 'https') {
        const hostname = request.nextUrl.hostname;

        if (!isAllowedHttpHost(hostname)) {
            const url = request.nextUrl.clone();
            url.protocol = 'https:';
            return NextResponse.redirect(url, 301);
        }
    }

    // Security: Block suspicious requests
    const userAgent = request.headers.get('user-agent') || '';
    const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /perl/i,
        /ruby/i,
        /java/i,
        /php/i,
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    if (isSuspicious && !request.nextUrl.pathname.startsWith('/api/')) {
        console.warn('Suspicious request blocked:', {
            userAgent,
            url: request.url,
        });
        return new NextResponse('Access Denied', { status: 403 });
    }

    // Security: Rate limiting for API endpoints
    if (request.nextUrl.pathname.startsWith('/api/')) {
        // Get IP from headers (X-Forwarded-For or X-Real-IP)
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

        // This is a simplified rate limiting - in production, use Redis or similar
        // For now, we'll just log suspicious activity
        console.log('API request from IP:', ip, 'to:', request.nextUrl.pathname);
    }

    // Check if we're on an auth page or root path
    const isAuthPage = request.nextUrl.pathname.startsWith('/signin') ||
        request.nextUrl.pathname.startsWith('/otp-verification') ||
        request.nextUrl.pathname.startsWith('/forgot-password') ||
        request.nextUrl.pathname.startsWith('/sso');

    // For auth pages, allow access with security headers
    if (isAuthPage) {
        const response = NextResponse.next();
        addSecurityHeaders(response);
        return response;
    }

    // For all other pages, allow access and let client-side handle authentication
    // The client-side will redirect to login if no token is found in localStorage
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
}

// Add security headers to response
function addSecurityHeaders(response: NextResponse): void {
    // Get security headers from configuration
    const securityHeaders = getSecurityHeaders();

    // Set all security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // Set HSTS header if required
    const hstsHeader = getHstsHeader();
    if (hstsHeader) {
        response.headers.set('Strict-Transport-Security', hstsHeader);
    }

    // Remove server information
    response.headers.delete('X-Powered-By');
    response.headers.delete('Server');
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    ],
}