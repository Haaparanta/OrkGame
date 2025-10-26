import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: false,
  output: "standalone",
  images: {
    unoptimized: true,
  },
}

export default nextConfig
