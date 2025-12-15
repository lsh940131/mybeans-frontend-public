import type { NextConfig } from "next";

const minioUrl = process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9000";
const minio = new URL(minioUrl);

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: minio.protocol.replace(":", "") as "http" | "https",
        hostname: minio.hostname,
        port: minio.port || undefined,
        pathname: "/mybeans/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/be/:path*",
        destination: `${process.env.REWRITE_ALIAS__be}/:path*`,
      },
    ];
  },
};

export default nextConfig;
