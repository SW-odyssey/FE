import type { DiscoveryLanguage } from "../discovery/model.ts";
import { attachMapSession, type DisposableMapSession } from "./controller.ts";
import {
  hasGoogleMapsKey,
  prepareGoogleMap,
  subscribeGoogleAuthFailure,
} from "./google/load-sdk.ts";
import { prepareKakaoMap } from "./kakao/session.ts";

export type MapProvider = "google" | "kakao";

export const hasLiveMapKey =
  hasGoogleMapsKey || Boolean(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);

/** Attach the configured map and fall back to Kakao if Google cannot load. */
export function attachPreferredMapSession<T extends DisposableMapSession>(
  language: DiscoveryLanguage,
  create: Record<MapProvider, () => T>,
  ready: (session: T, provider: MapProvider) => void,
  unavailable: (failed: boolean) => void,
) {
  let detach: (() => void) | undefined;
  let unsubscribe: (() => void) | undefined;

  function startKakao() {
    unsubscribe?.();
    detach?.();
    unavailable(false);
    detach = attachMapSession(
      prepareKakaoMap,
      create.kakao,
      (session) => ready(session, "kakao"),
      () => unavailable(true),
    );
  }

  if (hasGoogleMapsKey) {
    unsubscribe = subscribeGoogleAuthFailure(startKakao);
    detach = attachMapSession(
      () => prepareGoogleMap(language),
      create.google,
      (session) => ready(session, "google"),
      startKakao,
    );
  } else {
    detach = attachMapSession(
      prepareKakaoMap,
      create.kakao,
      (session) => ready(session, "kakao"),
      () => unavailable(true),
    );
  }
  return () => {
    unsubscribe?.();
    detach?.();
  };
}
