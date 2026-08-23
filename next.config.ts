import type { NextConfig } from "next";

// GitHub Pages などの静的ホスティングに出せるよう静的書き出し。
// 通常の `next dev` / `next start` でもそのまま動く。
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
