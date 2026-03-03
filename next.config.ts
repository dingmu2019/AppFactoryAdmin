import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "pg-pool", "pg-protocol", "pg-types", "pg-boss", "sharp", "onnxruntime-node", "dotenv"],
  // Reduce serverless function size by externalizing heavy packages if needed
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
