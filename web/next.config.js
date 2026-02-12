/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable webpack cache to avoid ENOENT/corruption leading to static asset 404s
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
