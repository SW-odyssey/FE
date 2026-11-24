import type { DiscoveryLanguage } from "../../discovery/model.ts";

declare global {
  interface Window {
    gm_authFailure?: () => void;
    localGoogleMapsReady?: () => void;
  }
}

const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
export const hasGoogleMapsKey = Boolean(key);
let sdk: Promise<void> | undefined;
let sdkLanguage: DiscoveryLanguage | undefined;
let authFailed = false;
const onAuthFailure = new Set<() => void>();

/** The 2D SDK sets its language when the script is first loaded into a document. */
export function googleMapsNeedsReload(language: DiscoveryLanguage): boolean {
  return Boolean(sdk && !authFailed && sdkLanguage !== language);
}

/** Subscribe to API authentication failures, including those reported after map creation. */
export function subscribeGoogleAuthFailure(callback: () => void) {
  onAuthFailure.add(callback);
  return () => onAuthFailure.delete(callback);
}

/** Load the public Maps JavaScript SDK once per page, without logging its key. */
export function prepareGoogleMap(language: DiscoveryLanguage): Promise<void> {
  if (!key || authFailed)
    return Promise.reject(new Error("Google map unavailable"));
  if (sdk) return sdk;
  sdkLanguage = language;
  sdk = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      cleanup();
      script.remove();
      sdk = undefined;
      reject(new Error("Could not load Google Maps"));
    };
    const timeout = window.setTimeout(fail, 12000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window.localGoogleMapsReady;
      script.onerror = null;
    };
    window.gm_authFailure = () => {
      authFailed = true;
      for (const listener of onAuthFailure) listener();
    };
    window.localGoogleMapsReady = () => {
      cleanup();
      resolve();
    };
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.search = new URLSearchParams({
      key,
      v: "quarterly",
      loading: "async",
      callback: "localGoogleMapsReady",
      region: "KR",
      language: language === "zh" ? "zh-CN" : language,
    }).toString();
    script.src = url.href;
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return sdk;
}
