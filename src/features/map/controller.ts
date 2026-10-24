import type {
  Coordinate,
  DiscoveryLanguage,
  LocalPlace,
} from "../discovery/model.ts";
import type { MapPlaceGroup } from "./geometry.ts";

export type MapCamera = Coordinate & {
  level: number;
  collection: string;
  selectedId: string | null;
};
export type ExploreMapProps = {
  places: LocalPlace[];
  selected: LocalPlace | null;
  language: DiscoveryLanguage;
  origin: Coordinate | null;
  onSelect: (place: LocalPlace) => void;
  focusSelected?: boolean;
  sheetInset?: number;
  viewportScale?: number;
  memory?: { current: MapCamera | null };
  scope?: string | null;
  onGroupSelect?: (group: MapPlaceGroup) => void;
};
export type ExploreMapOptions = ExploreMapProps & {
  sheetInset: number;
  viewportScale: number;
};
export type DisposableMapSession = { dispose: () => void };
export type ExploreMapSession = DisposableMapSession & {
  render: () => void;
  fitRecommendations: (restore?: boolean) => void;
  focusSelected: () => void;
  zoomBy: (delta: number) => void;
  centerOn: (point: Coordinate) => void;
};

/** Restore a camera only for the same ordered recommendation collection.
 * @param camera Previously remembered map camera
 * @param collection Current ordered place IDs
 * @returns Matching camera, or null so the new collection gets its initial fit
 */
export function restorableMapCamera(
  camera: MapCamera | null | undefined,
  collection: string,
): MapCamera | null {
  return camera?.collection === collection ? camera : null;
}

/** Attach one asynchronous SDK session and dispose it when its owner leaves.
 * @param load SDK preparation, shared by the explore and mini maps
 * @param create Session factory called only while this owner is still active
 * @param ready Callback receiving the newly created session
 * @param failed Callback for an active owner's load or creation failure
 * @returns Idempotent cleanup, including cancellation while the SDK is loading
 */
export function attachMapSession<T extends DisposableMapSession>(
  load: () => Promise<void>,
  create: () => T,
  ready: (session: T) => void,
  failed: () => void,
): () => void {
  let disposed = false;
  let session: T | undefined;
  void load()
    .then(() => {
      if (disposed) return;
      session = create();
      ready(session);
    })
    .catch(() => {
      if (!disposed) failed();
    });
  return () => {
    if (disposed) return;
    disposed = true;
    session?.dispose();
  };
}
