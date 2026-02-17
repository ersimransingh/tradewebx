import type { NextConfig } from "next";

// Helper function to check if development mode is enabled
function isDevelopmentMode(): boolean {
  return process.env.NEXT_DEVELOPMENT_MODE === 'true';
}

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  output: 'standalone',
  poweredByHeader: false, // Disable X-Powered-By header

  // Image configuration for standalone builds with basePath
  images: {
    unoptimized: true, // Disable image optimization to serve images directly
  },

  // Security headers configuration
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    // Environment-aware CSP: strict in prod, permissive enough for localhost dev
    const cspPolicy = [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      isProd
        ? "img-src 'self' data: https: blob:"
        : "img-src 'self' data: http: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      isProd
        ? "connect-src 'self' https: wss:"
        : "connect-src 'self' http: https: ws: wss: http://localhost:* ws://localhost:*",
      isProd
        ? "media-src 'self' https:"
        : "media-src 'self' http: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.nsdl.com https://*.cdslindia.com",
      "frame-ancestors 'none'",
      isProd ? "upgrade-insecure-requests" : null,
    ]
      .filter(Boolean)
      .join('; ');

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
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
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
          }
          // Removed HSTS header to allow HTTP
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
  // Note: basePath automatically handles routing, no need for manual redirects
};

export default nextConfig;
