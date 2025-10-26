import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: false,
  output: "standalone",
  images: {
    unoptimized: true,
  },
  staticPageGenerationTimeout: 1000,
  poweredByHeader: false,
}

export default nextConfig
