import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const pagesBuild = process.env.LOCAL_PAGES_BUILD === "1";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: { unoptimized: true },
  output: pagesBuild ? "export" : undefined,
  trailingSlash: pagesBuild,
  allowedDevOrigins: [
    "127.0.0.1",
    ...Object.values(networkInterfaces()).flatMap((addresses) =>
      (addresses ?? [])
        .filter((address) => address.family === "IPv4" && !address.internal)
        .map((address) => address.address),
    ),
  ],
};

export default nextConfig;
