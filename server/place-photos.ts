import type { PlacePhoto } from "../src/features/discovery/model.ts";
import type { PlaceBusiness } from "../src/features/discovery/data/place-media.ts";
import {
  isLocalPlaceRequest,
  isOdysseyPlaceId,
  lookupPlaceRow,
  placeLanguage,
} from "./place-request.ts";

type GooglePhoto = {
  name: string;
  googleMapsUri?: string;
  authorAttributions?: { displayName?: string; uri?: string }[];
};

type GooglePlace = {
  photos?: GooglePhoto[];
  formattedAddress?: string;
  editorialSummary?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  googleMapsUri?: string;
};

const placesApi = "https://places.googleapis.com/v1/";
const headers = { "Cache-Control": "no-store" };
const sizes = { thumbnail: [640, 1], gallery: [1000, 3] } as const;
const galleryFields = [
  "photos",
  "formattedAddress",
  "editorialSummary",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours.weekdayDescriptions",
  "googleMapsUri",
].join(",");

function httpsUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    if (url.protocol === "https:" && !url.username && !url.password) return url;
  } catch {
    return undefined;
  }
}

/** Return attributed photos and, for a gallery, localized store information. */
export async function handlePlacePhotos(
  request: Request,
  key: string | undefined,
): Promise<Response> {
  const url = new URL(request.url);
  if (!key || !isLocalPlaceRequest(request, url))
    return new Response(null, { status: 404, headers });

  const id = url.searchParams.get("id") ?? "";
  const variant = url.searchParams.get("variant");
  const language = placeLanguage(url.searchParams.get("lang"));
  if (
    !isOdysseyPlaceId(id) ||
    !language ||
    (variant !== "thumbnail" && variant !== "gallery")
  )
    return new Response(null, { status: 400, headers });

  const [width, limit] = sizes[variant];
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]);
  async function googleJson<T>(path: string, fields?: string): Promise<T> {
    const upstream = await fetch(placesApi + path, {
      headers: {
        "X-Goog-Api-Key": key!,
        ...(fields && { "X-Goog-FieldMask": fields }),
      },
      redirect: "manual",
      signal,
    });
    if (!upstream.ok)
      throw new Error(`Places photo request returned HTTP ${upstream.status}`);
    return upstream.json();
  }

  try {
    const row = await lookupPlaceRow(id, signal);
    if (!row) return new Response(null, { status: 404, headers });
    const googleId = row.googlePlaceId;
    if (!googleId || !/^[\w-]{1,256}$/.test(googleId))
      return Response.json({ photoList: [] }, { headers });

    const isGallery = variant === "gallery";
    const lang = language === "zh" ? "zh-CN" : language;
    const google = await googleJson<GooglePlace>(
      `places/${googleId}${isGallery ? `?languageCode=${lang}` : ""}`,
      isGallery ? galleryFields : "photos",
    );
    const { photos = [], formattedAddress } = google;
    const prefix = `places/${googleId}/photos/`;
    const settled = await Promise.allSettled(
      photos.slice(0, limit).map(async (photo): Promise<PlacePhoto | null> => {
        if (
          !photo.name.startsWith(prefix) ||
          !/^[\w-]+$/.test(photo.name.slice(prefix.length))
        )
          return null;
        const media = await googleJson<{ photoUri?: string }>(
          `${photo.name}/media?maxWidthPx=${width}&skipHttpRedirect=true`,
        );
        const image = httpsUrl(media.photoUri);
        if (
          !image ||
          !image.hostname.endsWith(".googleusercontent.com") ||
          image.href.includes(key)
        )
          return null;
        return {
          src: image.href,
          imageUrl: image.href,
          credit: "Google Maps",
          sourceUrl: httpsUrl(photo.googleMapsUri)?.href ?? "",
          authors: (photo.authorAttributions ?? []).flatMap(
            ({ displayName, uri }) =>
              displayName
                ? [{ name: displayName, uri: httpsUrl(uri)?.href }]
                : [],
          ),
        };
      }),
    );
    const photoList = settled.flatMap((item) =>
      item.status === "fulfilled" && item.value ? [item.value] : [],
    );
    const failed = settled.find((item) => item.status === "rejected");
    if (!isGallery && !photoList.length && failed) throw failed.reason;
    const business: PlaceBusiness | undefined = isGallery
      ? {
          about: google.editorialSummary?.text,
          rating: google.rating,
          ratingCount: google.userRatingCount,
          phone: google.nationalPhoneNumber,
          website: httpsUrl(google.websiteUri)?.href,
          hours: google.regularOpeningHours?.weekdayDescriptions,
          mapsUrl: httpsUrl(google.googleMapsUri)?.href,
        }
      : undefined;
    return Response.json(
      { photoList, address: formattedAddress, business },
      { headers },
    );
  } catch (error) {
    console.warn(
      "Places photo lookup unavailable",
      error instanceof Error
        ? error.message.replaceAll(key, "[redacted]")
        : "Unknown error",
    );
    return new Response(null, { status: 502, headers });
  }
}
