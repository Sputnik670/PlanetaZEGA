import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error: La propiedad turbopack existe en runtime pero los tipos de TS aún no la reflejan
    turbopack: {
      root: path.resolve(__dirname),
    },
  },
};

export default nextConfig;