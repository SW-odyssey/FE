import { localText, placeCount } from "../../discovery/localization.ts";
import { layoutClusterNodes, layoutMapCaptions } from "../clusters.ts";
import { previewMapInsets, type ExploreMapOptions } from "../controller.ts";
import { groupMapMarkers, inMapScope, mapCaptionLimit } from "../geometry.ts";

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
  entryTimer: ReturnType<typeof setTimeout>;
};

/** Place selected names first, then use the remaining space for nearby names.
 * @param labels Map overlay labels with the same IDs as their screen points
 * @param points Projected logical positions of visible overlay anchors
 * @param offsets Offsets used to keep map hit targets separate
 * @param bounds Uncovered map size, excluding the bottom sheet and navigation
 * @param selectedId Place node whose caption has priority
 * @param maxLabels Name limit for the current zoom
 * @returns Updates caption visibility and position without changing map state
 */
function paintMapCaptions(
  labels: readonly MapLabel[],
  points: readonly { id: string; x: number; y: number }[],
  offsets: Map<string, { x: number; y: number }>,
  bounds: { width: number; height: number; top: number },
  selectedId: string | null,
  maxLabels: number,
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
    top: bounds.top,
    right: bounds.width - 64,
    bottom: bounds.height - 8,
    selectedId,
    obstacles: drawn,
    maxLabels,
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
      viewportInsets = previewMapInsets,
      onSelect,
      onGroupSelect,
    } = options;
    const ko = language === "ko";
    const t = (en: string, kr: string) => localText(language, en, kr);
    const projection = current.getProjection();
    const level = current.getLevel();
    const groups = groupMapMarkers(
      displayPlaces,
      (place) => {
        const point = projection.containerPointFromCoords(
          new kakao.maps.LatLng(place.lat, place.lng),
        );
        return {
          x: point.x / viewportScale,
          y: point.y / viewportScale,
        };
      },
      level,
      selected?.id,
    );
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
        button.append(symbol, caption);
        content.append(button);
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
      node.button.className = `local-map-pin ${group.kind === "place" ? "is-anchored-place" : "is-cluster"} ${active ? "is-selected" : ""} ${entering ? "is-entering" : ""}`;
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
        group.kind === "place" ? "local-location-dot" : "local-cluster-count";
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
          const top = viewportInsets.top + 12;
          const bottom = Math.min(
            sheetInset + viewportInsets.bottom + 24,
            Math.max(0, element.clientHeight / viewportScale - top - 64),
          );
          current.setBounds(
            bounds,
            top * viewportScale,
            72 * viewportScale,
            bottom * viewportScale,
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
    const { top } = viewportInsets;
    const height =
      element.clientHeight / viewportScale - sheetInset - viewportInsets.bottom;
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
          point.y >= top - 10 &&
          point.y <= height,
      );
    const pinned = groups.find((group) =>
      group.places.some((place) => place.id === selected?.id),
    )?.id;
    const offsets = layoutClusterNodes(points, {
      left: 12,
      top,
      right: width - 64,
      bottom: height - 8,
      pinnedId: pinned,
      maxDisplacement: 24,
    });
    const selectedPoint = points.find((point) => point.id === pinned);
    if (
      selectedPoint &&
      (selectedPoint.x < 34 ||
        selectedPoint.x > width - 86 ||
        selectedPoint.y < top + 22 ||
        selectedPoint.y > height - 30)
    )
      offsets.delete(selectedPoint.id);
    for (const node of nodes) {
      const offset = offsets.get(node.id);
      node.button.hidden = !offset;
      node.button.style.transform = offset
        ? `translate(${offset.x}px,${offset.y}px)`
        : "none";
    }
    paintMapCaptions(
      nodes.filter(
        (node) =>
          Boolean(node.caption?.textContent) &&
          (level <= 4 || node.id === pinned),
      ),
      points,
      offsets,
      { width, height, top },
      pinned ?? null,
      mapCaptionLimit(level, width),
    );
    for (const node of nodes)
      if (
        node.caption &&
        (!node.caption.textContent || (level > 4 && node.id !== pinned))
      )
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
