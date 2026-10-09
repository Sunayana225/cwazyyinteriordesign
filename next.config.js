const { publicBuildInfo } = require('./scripts/public-build-info.cjs');
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: publicBuildInfo(process.env, require('./package.json').version),
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
}

module.exports = nextConfig
