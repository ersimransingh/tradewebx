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

  // Security headers configuration (static assets); CSP is applied dynamically in middleware
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
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
