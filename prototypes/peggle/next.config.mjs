/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Next 16 treats 127.0.0.1 as a different origin from localhost and
  // blocks /_next/hmr unless the opened hostname is listed here.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '::1', '172.30.0.2'],
  agentRules: false,
};

export default nextConfig;
