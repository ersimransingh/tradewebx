// Security Configuration
// This file centralizes all security settings for easy management

// Helper function to check if development mode is enabled
function isDevelopmentMode(): boolean {
    return process.env.NEXT_DEVELOPMENT_MODE === 'true';
}

export const SECURITY_CONFIG = {
    // Request signature key for API security
    REQUEST_SIGNATURE_KEY: 'TradeWebX_Security_Key_2024',

    // Request timeout in milliseconds
    REQUEST_TIMEOUT: 30000,

    // Maximum retry attempts for failed requests
    MAX_RETRY_ATTEMPTS: 3,

    // Force HTTPS in production
    FORCE_HTTPS: process.env.NODE_ENV === 'production',

    // Allowed hosts that can run without HTTPS (for development and testing)
    // In development mode, all localhost variants are allowed
    // In production, only specific domains should be added here
    ALLOWED_HTTP_HOSTS: isDevelopmentMode() ? [
        'localhost',
        '127.0.0.1',
        '0.0.0.0'
    ] : [
        // Add production-specific domains here if needed
        // Example: 'api.yourdomain.com'
    ],

    // Rate limiting configuration
    RATE_LIMITING: {
        MAX_LOGIN_ATTEMPTS: 30,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
        API_RATE_LIMIT: 100, // requests per minute
    },

    // Security headers configuration
    SECURITY_HEADERS: {
        // Content Security Policy - Controls resources the browser is allowed to load
        CSP_POLICY: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https: wss:",
            "media-src 'self' https:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ].join('; '),

        // HTTP Strict Transport Security - Forces HTTPS connections
        HSTS_MAX_AGE: '31536000', // 1 year
        HSTS_INCLUDE_SUBDOMAINS: true,
        HSTS_PRELOAD: true,

        // X-Frame-Options - Prevents clickjacking by restricting iframe embedding
        X_FRAME_OPTIONS: 'DENY',

        // X-Content-Type-Options - Stops MIME type sniffing vulnerabilities
        X_CONTENT_TYPE_OPTIONS: 'nosniff',

        // X-XSS-Protection - Additional XSS protection (legacy but still useful)
        X_XSS_PROTECTION: '1; mode=block',

        // Referrer-Policy - Controls the amount of referrer information sent
        REFERRER_POLICY: 'strict-origin-when-cross-origin',

        // Permissions-Policy - Restricts access to powerful browser features
        PERMISSIONS_POLICY: [
            'accelerometer=()',
            'ambient-light-sensor=()',
            'autoplay=()',
            'battery=()',
            'camera=()',
            'cross-origin-isolated=()',
            'display-capture=()',
            'document-domain=()',
            'encrypted-media=()',
            'execution-while-not-rendered=()',
            'execution-while-out-of-viewport=()',
            'fullscreen=()',
            'geolocation=()',
            'gyroscope=()',
            'keyboard-map=()',
            'magnetometer=()',
            'microphone=()',
            'midi=()',
            'navigation-override=()',
            'payment=()',
            'picture-in-picture=()',
            'publickey-credentials-get=()',
            'screen-wake-lock=()',
            'sync-xhr=()',
            'usb=()',
            'web-share=()',
            'xr-spatial-tracking=()'
        ].join(', '),

        // Additional security headers
        X_DNS_PREFETCH_CONTROL: 'off',
        X_DOWNLOAD_OPTIONS: 'noopen',
        X_PERMITTED_CROSS_DOMAIN_POLICIES: 'none',
    },

    // Token validation cache duration (5 minutes)
    TOKEN_CACHE_DURATION: 5 * 60 * 1000,

    // Maximum request age for replay attack prevention (5 minutes)
    MAX_REQUEST_AGE: 5 * 60 * 1000,
};

// Helper function to check if a hostname is allowed to run without HTTPS
export function isAllowedHttpHost(hostname: string): boolean {
    // If development mode is enabled, allow all URLs
    if (isDevelopmentMode()) {
        return true;
    }

    return SECURITY_CONFIG.ALLOWED_HTTP_HOSTS.some(host => {
        if (host.startsWith('.')) {
            // Handle wildcard subdomains
            return hostname === host.slice(1) || hostname.endsWith(host);
        }
        return hostname === host;
    });
}

// Helper function to check if we're in development mode
export function isDevelopmentEnvironment(): boolean {
    if (typeof window === 'undefined') return isDevelopmentMode() || process.env.NODE_ENV === 'development';

    const hostname = window.location.hostname;
    return isDevelopmentMode() ||
        process.env.NODE_ENV === 'development' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0';
}

// Helper function to check if HTTPS is required for current environment
export function isHttpsRequired(hostname: string): boolean {
    // If development mode is enabled, HTTPS is not required
    if (isDevelopmentMode()) {
        return false;
    }

    if (!SECURITY_CONFIG.FORCE_HTTPS) {
        return false; // HTTPS not required in development
    }

    return !isAllowedHttpHost(hostname);
}

// Helper function to get security headers
export function getSecurityHeaders(): Record<string, string> {
    // Generate CSP policy based on development mode
    const isDevMode = isDevelopmentMode();

    const cspPolicy = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        // Allow HTTP connections in development mode
        isDevMode ? "connect-src 'self' http: https: wss:" : "connect-src 'self' https: wss:",
        "media-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        // Only add upgrade-insecure-requests if not in development mode
        ...(isDevMode ? [] : ["upgrade-insecure-requests"])
    ].join('; ');

    return {
        // Content Security Policy
        'Content-Security-Policy': cspPolicy,

        // X-Frame-Options - Prevents clickjacking
        'X-Frame-Options': SECURITY_CONFIG.SECURITY_HEADERS.X_FRAME_OPTIONS,

        // X-Content-Type-Options - Prevents MIME type sniffing
        'X-Content-Type-Options': SECURITY_CONFIG.SECURITY_HEADERS.X_CONTENT_TYPE_OPTIONS,

        // X-XSS-Protection - Additional XSS protection
        'X-XSS-Protection': SECURITY_CONFIG.SECURITY_HEADERS.X_XSS_PROTECTION,

        // Referrer-Policy - Controls referrer information
        'Referrer-Policy': SECURITY_CONFIG.SECURITY_HEADERS.REFERRER_POLICY,

        // Permissions-Policy - Restricts browser features
        'Permissions-Policy': SECURITY_CONFIG.SECURITY_HEADERS.PERMISSIONS_POLICY,

        // Additional security headers
        'X-DNS-Prefetch-Control': SECURITY_CONFIG.SECURITY_HEADERS.X_DNS_PREFETCH_CONTROL,
        'X-Download-Options': SECURITY_CONFIG.SECURITY_HEADERS.X_DOWNLOAD_OPTIONS,
        'X-Permitted-Cross-Domain-Policies': SECURITY_CONFIG.SECURITY_HEADERS.X_PERMITTED_CROSS_DOMAIN_POLICIES,

        // Remove server information
        'X-Powered-By': '',
        'Server': '',
    };
}

// Helper function to get HSTS header (only for HTTPS)
export function getHstsHeader(): string | null {
    // If development mode is enabled, don't set HSTS header
    if (isDevelopmentMode()) {
        return null;
    }

    if (!SECURITY_CONFIG.FORCE_HTTPS) {
        return null;
    }

    const hstsParts = [`max-age=${SECURITY_CONFIG.SECURITY_HEADERS.HSTS_MAX_AGE}`];

    if (SECURITY_CONFIG.SECURITY_HEADERS.HSTS_INCLUDE_SUBDOMAINS) {
        hstsParts.push('includeSubDomains');
    }

    if (SECURITY_CONFIG.SECURITY_HEADERS.HSTS_PRELOAD) {
        hstsParts.push('preload');
    }

    return hstsParts.join('; ');
}

// Environment-specific configuration
export const ENV_CONFIG = {
    // Development environment settings
    development: {
        FORCE_HTTPS: false,
        ALLOWED_HTTP_HOSTS: isDevelopmentMode() ? ['localhost', '127.0.0.1', '0.0.0.0'] : [],
        DEBUG_MODE: true,
    },

    // Production environment settings
    production: {
        FORCE_HTTPS: true,
        ALLOWED_HTTP_HOSTS: SECURITY_CONFIG.ALLOWED_HTTP_HOSTS,
        DEBUG_MODE: false,
    },

    // Test environment settings
    test: {
        FORCE_HTTPS: false,
        ALLOWED_HTTP_HOSTS: isDevelopmentMode() ? ['localhost', '127.0.0.1'] : [],
        DEBUG_MODE: true,
    },
};

// Get current environment configuration
export function getCurrentEnvConfig() {
    const env = process.env.NODE_ENV || 'development';
    return ENV_CONFIG[env as keyof typeof ENV_CONFIG] || ENV_CONFIG.development;
} 