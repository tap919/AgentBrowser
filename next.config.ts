import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';
const connectSrc = isDev
  ? `'self' ws://localhost:* http://localhost:*`
  : `'self'`;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src " + connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        child_process: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/proxy',
        headers: securityHeaders.filter(h => h.key !== 'X-Frame-Options'),
      },
      {
        source: '/((?!api/proxy).*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
