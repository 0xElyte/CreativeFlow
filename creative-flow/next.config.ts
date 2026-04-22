import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["ioredis"],
  turbopack: {
    root: __dirname,
  },
};

export default withBundleAnalyzer(nextConfig);
