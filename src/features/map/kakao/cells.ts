import type { ExploreMapOptions } from "../controller.ts";
import { groupMapPlaces, inMapScope, previewCell } from "../geometry.ts";

/** Own the SDK polygons and cell-selection listeners separately from pin overlays.
 * @param map SDK map receiving the preview cell geometry
 * @returns Cell renderer and polygon/listener cleanup
 */
export function createMapCells(map: kakao.maps.Map) {
  const cells: { polygon: kakao.maps.Polygon; click: () => void }[] = [];
  function dispose() {
    for (const { polygon, click } of cells) {
      kakao.maps.event.removeListener(polygon, "click", click);
      polygon.setMap(null);
    }
    cells.length = 0;
  }
  function render(options: ExploreMapOptions) {
    dispose();
    const level = map.getLevel();
    if (level > 4) return;
    const close = level <= 3;
    for (const group of groupMapPlaces(options.places, true)) {
      const cell = previewCell(group.places[0]);
      const selected =
        Boolean(
          options.scope &&
          group.places.some((place) => inMapScope(place, options.scope)),
        ) || group.places.some((place) => place.id === options.selected?.id);
      const polygon = new kakao.maps.Polygon({
        map,
        path: cell.polygon.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)),
        fillColor: "#6264b4",
        fillOpacity: selected ? 0.24 : close ? 0.05 : 0.12,
        strokeColor: "#6264b4",
        strokeOpacity: selected ? 0.85 : close ? 0.18 : 0.4,
        strokeWeight: selected ? 1.5 : 0.8,
        zIndex: 2,
      });
      const click = () => options.onGroupSelect?.(group);
      kakao.maps.event.addListener(polygon, "click", click);
      cells.push({ polygon, click });
    }
  }
  return { render, dispose };
}
