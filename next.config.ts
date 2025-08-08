import type { NextConfig } from "next";

// Helper function to check if development mode is enabled
function isDevelopmentMode(): boolean {
  return process.env.NEXT_DEVELOPMENT_MODE === 'true';
}

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  output: 'standalone',
  poweredByHeader: false, // Disable X-Powered-By header

  // Security headers configuration
  async headers() {
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

    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: cspPolicy
          },
          // X-Frame-Options - Prevents clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // X-Content-Type-Options - Prevents MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // X-XSS-Protection - Additional XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer-Policy - Controls referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions-Policy - Restricts browser features
          {
            key: 'Permissions-Policy',
            value: [
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
            ].join(', ')
          },
          // Additional security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off'
          },
          {
            key: 'X-Download-Options',
            value: 'noopen'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
          // HTTP Strict Transport Security (only in production and not in development mode)
          ...(process.env.NODE_ENV === 'production' && !isDevMode ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : [])
        ]
      }
    ];
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  redirects: process.env.NEXT_PUBLIC_BASE_PATH ? async () => {
    return [
      {
        source: "/",
        destination: process.env.NEXT_PUBLIC_BASE_PATH || "",
        permanent: true, // Set to true for a 308 redirect, false for a 307 redirect
      },
    ];
  } : undefined,
};

export default nextConfig;
