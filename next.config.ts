import type { NextConfig } from "next";

// Helper function to check if development mode is enabled
function isDevelopmentMode(): boolean {
  return process.env.NEXT_DEVELOPMENT_MODE === 'true';
}

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  output: 'standalone',
  poweredByHeader: false, // Disable X-Powered-By header

  // Add experimental features for better error handling
  experimental: {
    serverComponentsExternalPackages: ['axios'],
  },

  // Add logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Security headers configuration
  async headers() {
    // Generate CSP policy that allows both HTTP and HTTPS
    const cspPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "img-src 'self' data: http: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' http: https: wss:",
      "media-src 'self' http: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
      // No upgrade-insecure-requests to allow HTTP
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
