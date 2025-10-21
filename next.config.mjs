/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent static export attempts - use server-side rendering
  output: 'standalone',
};

export default nextConfig;
