/** @type {import('next').NextConfig} */
const nextConfig = {
  // These are fixed local PNGs shown for pixel-level review, so the optimiser
  // would only get in the way.
  images: { unoptimized: true },
};

export default nextConfig;
