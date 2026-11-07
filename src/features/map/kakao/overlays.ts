import { localText, placeCount } from "../../discovery/localization.ts";
import {
  clusterScreenPlaces,
  layoutClusterNodes,
  layoutMapCaptions,
} from "../clusters.ts";
import type { ExploreMapOptions } from "../controller.ts";
import { groupMapPlaces, inMapScope, type MapPlaceGroup } from "../geometry.ts";

type MapLabel = {
  id: string;
  caption?: HTMLSpanElement;
};
type PooledMapNode = MapLabel & {
  position: kakao.maps.LatLng;
  overlay: kakao.maps.CustomOverlay;
  map: kakao.maps.Map;
  button: HTMLButtonElement;
  symbol: HTMLSpanElement;
  line: HTMLSpanElement;
  entryTimer: ReturnType<typeof setTimeout>;
};

/** Place selected names first, then use the remaining space for nearby names.
 * @param labels Map overlay labels with the same IDs as their screen points
 * @param points Projected logical positions of visible overlay anchors
 * @param offsets Offsets used to keep map hit targets separate
 * @param bounds Uncovered map size, excluding the bottom sheet and navigation
 * @param selectedId Place node whose caption has priority
 * @returns Updates caption visibility and position without changing map state
 */
function paintMapCaptions(
  labels: readonly MapLabel[],
  points: readonly { id: string; x: number; y: number }[],
  offsets: Map<string, { x: number; y: number }>,
  bounds: { width: number; height: number },
  selectedId: string | null,
) {
  const drawn = points.flatMap((point) => {
    const offset = offsets.get(point.id);
    return offset
      ? [{ ...point, x: point.x + offset.x, y: point.y + offset.y }]
      : [];
  });
  const candidates = labels.flatMap((label) => {
    const point = drawn.find((node) => node.id === label.id);
    return label.caption && point
      ? [
          {
            ...point,
            width: Math.min(
              label.id === selectedId ? 160 : 132,
              Math.max(
                72,
                [...(label.caption.textContent ?? "")].reduce(
                  (sum, char) => sum + (char.charCodeAt(0) > 255 ? 11 : 6),
                  14,
                ),
              ),
            ),
            height: 40,
          },
        ]
      : [];
  });
  const placements = layoutMapCaptions(candidates, {
    left: 12,
    top: 240,
    right: bounds.width - 64,
    bottom: bounds.height - 8,
    selectedId,
    obstacles: drawn,
    maxLabels: 3,
  });
  for (const label of labels) {
    if (!label.caption) continue;
    const placement = placements.get(label.id);
    const offset = offsets.get(label.id);
    label.caption.hidden = !placement || !offset;
    if (placement && offset) {
      label.caption.classList.remove("is-left");
      label.caption.classList.toggle("is-above", placement.side === "top");
      label.caption.classList.toggle("is-below", placement.side === "bottom");
      label.caption.style.maxWidth = `${placement.maxWidth}px`;
      label.caption.style.width = `${placement.maxWidth}px`;
      label.caption.style.left = "50%";
      label.caption.style.right = "auto";
      label.caption.style.top = placement.side === "bottom" ? "50px" : "auto";
      label.caption.style.bottom = placement.side === "top" ? "50px" : "auto";
      label.caption.style.transform = "translateX(-50%)";
      label.caption.style.pointerEvents = "auto";
    }
  }
}
/** Own the DOM overlays for one Kakao map; idle renders reuse existing nodes.
 * @param current SDK map whose projection positions the overlays
 * @param element Existing scaled map canvas
 * @returns Current-state renderer and complete overlay/timer cleanup
 */
export function createMapOverlays(
  current: kakao.maps.Map,
  element: HTMLDivElement,
) {
  const pool = new Map<string, PooledMapNode>();
  function render(options: ExploreMapOptions) {
    const {
      places: displayPlaces,
      selected,
      language,
      scope,
      sheetInset,
      viewportScale,
      onSelect,
      onGroupSelect,
    } = options;
    const cellGroups = groupMapPlaces(displayPlaces, true);
    const ko = language === "ko";
    const t = (en: string, kr: string) => localText(language, en, kr);
    const projection = current.getProjection();
    const level = current.getLevel();
    const mode = level > 4 ? "areas" : level > 3 ? "cells" : "places";
    const projectedPlaces = displayPlaces.map((place) => {
      const point = projection.containerPointFromCoords(
        new kakao.maps.LatLng(place.lat, place.lng),
      );
      return {
        id: place.id,
        x: point.x / viewportScale,
        y: point.y / viewportScale,
      };
    });
    const groups: (MapPlaceGroup & {
      kind: "cluster" | "cell" | "place";
    })[] =
      mode === "areas"
        ? clusterScreenPlaces(projectedPlaces, {
            radius: 52,
            selectedId: selected?.id,
          }).map((cluster) => {
            const members = cluster.memberIds.map((id) =>
              displayPlaces.find((place) => place.id === id)!,
            );
            return {
              id: cluster.id,
              places: members,
              lat:
                members.reduce((sum, place) => sum + place.lat, 0) /
                members.length,
              lng:
                members.reduce((sum, place) => sum + place.lng, 0) /
                members.length,
              kind: members.length > 1 ? "cluster" : "place",
            };
          })
        : mode === "cells"
          ? cellGroups.map((group) => ({ ...group, kind: "cell" }))
          : displayPlaces.map((place) => ({
              id: `place:${place.id}`,
              lat: place.lat,
              lng: place.lng,
              places: [place],
              kind: "place",
            }));
    const wanted = new Set(groups.map((group) => group.id));
    for (const [id, node] of pool) {
      if (wanted.has(id)) continue;
      clearTimeout(node.entryTimer);
      node.overlay.setMap(null);
      pool.delete(id);
    }
    const nodes = groups.map((group) => {
      const place = group.places[0];
      const active =
        group.places.some((member) => member.id === selected?.id) ||
        Boolean(
          scope && group.places.some((member) => inMapScope(member, scope)),
        );
      const position = new kakao.maps.LatLng(group.lat, group.lng);
      let node = pool.get(group.id);
      if (!node) {
        const wrap = document.createElement("div");
        wrap.className = "local-pin-wrapper";
        const content = document.createElement("div");
        const button = document.createElement("button");
        const symbol = document.createElement("span");
        const caption = document.createElement("span");
        caption.className = "local-map-caption";
        const line = document.createElement("span");
        line.className = "local-pin-line";
        line.style.left = "22px";
        line.style.top = "22px";
        button.append(symbol, caption);
        content.append(line, button);
        wrap.append(content);
        const overlay = new kakao.maps.CustomOverlay({
          map: current,
          position,
          content: wrap,
          yAnchor: 0.5,
        });
        button.classList.add("is-entering");
        const entryTimer = setTimeout(
          () => button.classList.remove("is-entering"),
          180,
        );
        node = {
          id: group.id,
          overlay,
          map: current,
          position,
          button,
          symbol,
          caption,
          line,
          entryTimer,
        };
        pool.set(group.id, node);
      }
      const wrap = node.button.parentElement!.parentElement!;
      const content = node.button.parentElement!;
      wrap.style.width = `${44 * viewportScale}px`;
      wrap.style.height = `${44 * viewportScale}px`;
      content.style.cssText = `width:44px;height:44px;transform:scale(${viewportScale});transform-origin:top left`;
      node.position = position;
      node.overlay.setPosition(position);
      if (node.map !== current) {
        node.overlay.setMap(current);
        node.map = current;
      }
      node.overlay.setZIndex(
        group.places.some((member) => member.id === selected?.id)
          ? 30
          : active
            ? 20
            : 10,
      );
      const entering = node.button.classList.contains("is-entering");
      node.button.className = `local-map-pin ${group.kind === "cluster" ? "is-cluster" : group.kind === "cell" ? "is-cells-label" : "is-anchored-place"} ${active ? "is-selected" : ""} ${entering ? "is-entering" : ""}`;
      node.button.style.width = "44px";
      node.button.style.height = "44px";
      node.button.dataset.mapKind = group.kind;
      node.button.dataset.placeIds = group.places
        .map((member) => member.id)
        .join(",");
      node.button.setAttribute("aria-pressed", String(active));
      node.button.setAttribute(
        "aria-label",
        group.kind === "cluster"
          ? `${t("Zoom in", "확대")} ${placeCount(language, group.places.length)}`
          : group.kind === "cell"
            ? `${t("Choose a cell", "구역 선택")} ${placeCount(language, group.places.length)}`
            : ko
              ? place.koreanName
              : place.name,
      );
      node.symbol.className =
        group.kind === "cluster"
          ? "local-cluster-count"
          : group.kind === "cell"
            ? "local-cell-count"
            : "local-location-dot";
      node.symbol.textContent =
        group.kind === "place" ? "" : String(group.places.length);
      node.caption!.textContent =
        group.kind === "place" ? (ko ? place.koreanName : place.name) : "";
      node.button.onclick = (event) => {
        event.stopPropagation();
        kakao.maps.event.preventMap();
        if (group.kind === "place") onSelect(place);
        else if (group.kind === "cell") onGroupSelect?.(group);
        else {
          const bounds = new kakao.maps.LatLngBounds();
          group.places.forEach((member) =>
            bounds.extend(new kakao.maps.LatLng(member.lat, member.lng)),
          );
          const previous = current.getLevel();
          current.setBounds(
            bounds,
            252 * viewportScale,
            72 * viewportScale,
            (sheetInset + 110) * viewportScale,
            40 * viewportScale,
          );
          if (current.getLevel() >= previous)
            current.setLevel(Math.max(1, previous - 1), {
              animate: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? false
                : { duration: 180 },
            });
        }
      };
      return node;
    });

    const width = element.clientWidth / viewportScale;
    const height = element.clientHeight / viewportScale - sheetInset - 86;
    const points = nodes
      .map((node) => {
        const point = projection.containerPointFromCoords(node.position);
        return {
          id: node.id,
          memberIds: [],
          count: 1,
          x: point.x / viewportScale,
          y: point.y / viewportScale,
        };
      })
      .filter(
        (point) =>
          point.x >= 0 &&
          point.x <= width &&
          point.y >= 230 &&
          point.y <= height,
      );
    const pinned = groups.find((group) =>
      group.places.some((place) => place.id === selected?.id),
    )?.id;
    const offsets = layoutClusterNodes(points, {
      left: 12,
      top: 240,
      right: width - 64,
      bottom: height - 8,
      pinnedId: pinned,
      maxDisplacement: mode === "places" ? 48 : 80,
    });
    const selectedPoint = points.find((point) => point.id === pinned);
    if (
      selectedPoint &&
      (selectedPoint.x < 34 ||
        selectedPoint.x > width - 86 ||
        selectedPoint.y < 262 ||
        selectedPoint.y > height - 30)
    )
      offsets.delete(selectedPoint.id);
    for (const node of nodes) {
      const offset = offsets.get(node.id);
      node.button.hidden = !offset;
      node.button.style.transform = offset
        ? `translate(${offset.x}px,${offset.y}px)`
        : "none";
      node.line.hidden = !offset || Math.hypot(offset.x, offset.y) < 1;
      node.line.style.display = node.line.hidden ? "none" : "block";
      if (offset) {
        node.line.style.width = `${Math.hypot(offset.x, offset.y)}px`;
        node.line.style.transform = `rotate(${Math.atan2(offset.y, offset.x)}rad)`;
      }
    }
    paintMapCaptions(
      nodes.filter((node) => Boolean(node.caption?.textContent)),
      points,
      offsets,
      { width, height },
      pinned ?? null,
    );
    for (const node of nodes)
      if (!node.caption?.textContent && node.caption)
        node.caption.hidden = true;
  }
  function dispose() {
    for (const node of pool.values()) {
      clearTimeout(node.entryTimer);
      node.overlay.setMap(null);
    }
    pool.clear();
  }
  return { render, dispose };
}
