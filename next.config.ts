// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  // ── Static font file headers ─────────────────────────────────────────────
  // Files in public/f/** are the raw .woff2 files.
  // They need:
  //   - CORS so any website can load them
  //   - Immutable 1-year cache (content-hash versioning via filenames)
  async headers() {
    return [
      {
        source: '/f/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts-index.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400',
          },
        ],
      },
    ];
  },
};

export default config;
