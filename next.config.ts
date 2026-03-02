import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Reduce serverless function size by externalizing heavy packages if needed
  experimental: {
    serverComponentsExternalPackages: ["pg-boss", "sharp", "onnxruntime-node"],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
