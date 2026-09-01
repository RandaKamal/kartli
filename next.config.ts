import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "172.21.0.161",
    "172.21.0.161:3000",
    "192.168.*.*",
    "10.*.*.*",
  ],
};

export default nextConfig;

