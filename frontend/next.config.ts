import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // 목 데이터용 더미 이미지. 실제 이미지 호스트가 정해지면 교체
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
