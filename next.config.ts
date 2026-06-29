import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '150mb',
    },
  },
  images: {
    // Cover art is served from a few known origins: the R2 public bucket
    // (pub-*.r2.dev), the R2 S3 endpoint (*.r2.cloudflarestorage.com), an
    // optional custom CDN domain set via R2_CDN_URL, or our own /api/cover/*
    // proxy (same-origin, no pattern needed). Allow all of them so next/image
    // can optimize + serve responsive WebP/AVIF for album art everywhere.
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      // Optional custom CDN domain (R2_CDN_URL). No-op if unset.
      ...(process.env.R2_CDN_URL
        ? [new URL(process.env.R2_CDN_URL).hostname].map((hostname) => ({
            protocol: "https" as const,
            hostname,
          }))
        : []),
    ],
  },
};

export default nextConfig;
