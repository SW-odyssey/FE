// The SDK supports jump; the community declaration package omits it.
declare namespace kakao.maps {
  interface Map {
    jump(
      center: LatLng,
      level: number,
      options?: { animate?: boolean | { duration: number } },
    ): void;
  }
}
