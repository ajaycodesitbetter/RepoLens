import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Replit dev preview is served via an mTLS proxy under a different host.
  // Allow any host so the dev server doesn't reject proxied requests.
  allowedDevOrigins: ["*"],
};

export default nextConfig;
