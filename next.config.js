/**
 * Great-Favour Montessori School (GFMS)
 * Next.js Production Configuration for cPanel Shared Hosting (Truehost)
 * @type {import('next').NextConfig}
 */

// Disable Next.js telemetry
process.env.NEXT_TELEMETRY_DISABLED = '1';

const allowedOrigins = [
  'localhost:3000',
  'localhost',
  '127.0.0.1:3000',
  '127.0.0.1',
  'cbt.localhost:3000',
  'cbt.localhost',
  '*.localhost:3000',
  '*.localhost',
  'greatfavourmontessori.com.ng',
  'www.greatfavourmontessori.com.ng',
  'cbt.greatfavourmontessori.com.ng',
  '*.greatfavourmontessori.com.ng',
  '*.truehost.cloud',
];

if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_APP_URL).host;
    if (host && !allowedOrigins.includes(host)) {
      allowedOrigins.push(host);
    }
  } catch {
    // Ignore invalid URL
  }
}

if (process.env.NEXT_PUBLIC_CBT_URL) {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_CBT_URL).host;
    if (host && !allowedOrigins.includes(host)) {
      allowedOrigins.push(host);
    }
  } catch {
    // Ignore invalid URL
  }
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Keep memory usage minimal on shared hosting by releasing inactive page buffers
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  swcMinify: true,

  // Consistent build ID across multiple server workers / restarts to prevent deployment skew
  generateBuildId: async () => {
    return process.env.BUILD_ID || 'gfms-prod-build';
  },

  // Image optimization settings
  // 'unoptimized: true' is recommended for shared cPanel hosting to prevent OOM errors
  // caused by native image resizing binaries (sharp) under strict memory limits.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Ensure Server Actions work seamlessly behind reverse proxies (Apache/Passenger)
  // bodySizeLimit: 25mb allows large exam question papers, PDFs, and high-res images
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: '25mb',
    },
  },

  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/logo.jpg',
      },
      {
        source: '/cbt/_next/:path*',
        destination: '/_next/:path*',
      },
      {
        source: '/cbt/assets/:path*',
        destination: '/assets/:path*',
      },
      {
        source: '/cbt/logo.jpg',
        destination: '/logo.jpg',
      },
      {
        source: '/cbt/favicon.ico',
        destination: '/logo.jpg',
      },
      {
        source: '/cbt/cbt/:path*',
        destination: '/cbt/:path*',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:file(logo\\.jpg|icon\\.jpg|apple-icon\\.jpg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/cbt-sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/cbt-manifest.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
