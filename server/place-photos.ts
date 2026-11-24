import type { PlacePhoto } from "../src/features/discovery/model.ts";
import { odysseyApiOrigin } from "../src/features/discovery/data/odyssey-api-origin.ts";

type GooglePhoto = {
  name: string;
  googleMapsUri?: string;
  authorAttributions?: { displayName?: string; uri?: string }[];
};

const placesApi = "https://places.googleapis.com/v1/";
const headers = { "Cache-Control": "no-store" };
const sizes = { thumbnail: [640, 1], gallery: [1000, 3] } as const;

function httpsUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    if (url.protocol === "https:" && !url.username && !url.password) return url;
  } catch {
    return undefined;
  }
}

/** Return attributed photos for a place in the Odyssey dataset using the server key. */
export async function handlePlacePhotos(
  request: Request,
  key: string | undefined,
): Promise<Response> {
  const url = new URL(request.url);
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (
    !key ||
    !["local.hrxlou.com", "localhost", "127.0.0.1", "[::1]"].includes(
      url.hostname,
    ) ||
    (fetchSite !== null && fetchSite !== "same-origin")
  )
    return new Response(null, { status: 404, headers });

  const id = url.searchParams.get("id") ?? "";
  const variant = url.searchParams.get("variant");
  if (
    !/^[1-9]\d{0,15}$/.test(id) ||
    !Number.isSafeInteger(Number(id)) ||
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
    const lookup = await fetch(
      new URL(`/api/v2/places/${id}`, odysseyApiOrigin),
      { signal },
    );
    if (lookup.status === 404)
      return new Response(null, { status: 404, headers });
    if (!lookup.ok) return new Response(null, { status: 502, headers });
    const row = (await lookup.json()) as {
      success: boolean;
      data?: { googlePlaceId?: string };
    };
    const googleId = row.data?.googlePlaceId;
    if (!row.success || !googleId || !/^[\w-]{1,256}$/.test(googleId))
      return Response.json({ photoList: [] }, { headers });

    const { photos = [], formattedAddress } = await googleJson<{
      photos?: GooglePhoto[];
      formattedAddress?: string;
    }>(
      `places/${googleId}`,
      variant === "gallery" ? "photos,formattedAddress" : "photos",
    );
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
    if (!photoList.length && failed) throw failed.reason;
    return Response.json({ photoList, address: formattedAddress }, { headers });
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
