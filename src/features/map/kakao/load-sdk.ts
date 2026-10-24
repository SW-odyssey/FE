let loading: Promise<void> | undefined;
/** One SDK script across React Strict Mode mounts and client navigation. */
export function loadKakaoSdk(key: string): Promise<void> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "지도 응답을 받지 못했어요. 등록된 도메인을 확인해 주세요.",
          ),
        ),
      15_000,
    );
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=${encodeURIComponent(key)}`;
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("카카오 지도 연결을 확인해 주세요."));
    };
    script.onload = () => {
      if (!window.kakao?.maps) {
        clearTimeout(timer);
        reject(new Error("지도 API 사용 설정과 허용 도메인을 확인해 주세요."));
        return;
      }
      kakao.maps.load(() => {
        clearTimeout(timer);
        resolve();
      });
    };
    document.head.append(script);
  });
  const pending = loading;
  void pending.catch(() => {
    if (loading === pending) loading = undefined;
  });
  return loading;
}
