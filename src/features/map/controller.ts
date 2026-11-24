import type {
  Coordinate,
  DiscoveryLanguage,
  LocalPlace,
} from "../discovery/model.ts";
import { distanceMeters, type MapPlaceGroup } from "./geometry.ts";
import type { CourseStop } from "../discovery/course.ts";

export type MapCamera = Coordinate & {
  level: number;
  collection: string;
  selectedId: string | null;
};
export type MapViewportInsets = { top: number; bottom: number };
export const previewMapInsets: MapViewportInsets = { top: 240, bottom: 86 };

export type MapSearchViewport = {
  center: Coordinate;
  contains: (point: Coordinate) => boolean;
};

/** Offer a new search after a substantial pan into a viewport with no current results. */
export function canSearchMapViewport(
  anchor: Coordinate,
  viewport: MapSearchViewport,
  places: readonly Coordinate[],
): boolean {
  return (
    distanceMeters(anchor, viewport.center) >= 120 &&
    !places.some((place) => viewport.contains(place))
  );
}

export type ExploreMapProps = {
  places: LocalPlace[];
  selected: LocalPlace | null;
  language: DiscoveryLanguage;
  currentLocation: Coordinate | null;
  onLocate: (point: Coordinate) => void;
  searchOrigin?: Coordinate | null;
  onSearchArea?: (point: Coordinate) => void;
  onSelect: (place: LocalPlace) => void;
  focusSelected?: boolean;
  focusRequest?: number;
  sheetInset?: number;
  viewportScale?: number;
  viewportInsets?: MapViewportInsets;
  memory?: { current: MapCamera | null };
  scope?: string | null;
  onGroupSelect?: (group: MapPlaceGroup) => void;
  courseStops?: readonly CourseStop[];
  hideCourseLine?: boolean;
  onCourseStopSelect?: (stop: CourseStop) => void;
};
export type ExploreMapOptions = ExploreMapProps & {
  sheetInset: number;
  viewportScale: number;
  onViewportDragStart?: () => void;
  onViewportDrag?: () => void;
  onViewportIdle?: () => void;
};
export type DisposableMapSession = { dispose: () => void };
export type ExploreMapSession = DisposableMapSession & {
  render: () => void;
  fitRecommendations: (restore?: boolean) => void;
  focusSelected: () => void;
  zoomBy: (delta: number) => void;
  setCurrentLocation: (point: Coordinate) => void;
  centerOn: (point: Coordinate) => void;
  getSearchViewport: () => MapSearchViewport | null;
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
