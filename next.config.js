/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    optimizeCss: true,
    turbotrace: true,
    serverActions: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}
