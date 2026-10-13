/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === "development";
const nextConfig = {
  reactStrictMode: true,
  // Keep a production build from overwriting the bundle used by a running dev server.
  distDir: isDevelopment ? ".next-dev" : ".next",
};
module.exports = nextConfig;
