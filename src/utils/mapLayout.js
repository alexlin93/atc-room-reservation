// Percentage-based positioning so a zone/room box scales with the map
// canvas's actual rendered width, given its "map units" rect and the
// floor's overall canvasWidth/canvasHeight (see data/roomsData.js).
export function percentStyle(rect, data) {
  return {
    left: (rect.x / data.canvasWidth) * 100 + "%",
    top: (rect.y / data.canvasHeight) * 100 + "%",
    width: (rect.w / data.canvasWidth) * 100 + "%",
    height: (rect.h / data.canvasHeight) * 100 + "%",
  };
}

// Percentage-based left/top for a single point (used by map markers), with
// no width/height component of its own — the marker's own CSS size is a
// fixed small pixel box, centered on this point via transform.
export function percentPoint(point, data) {
  return {
    left: (point.x / data.canvasWidth) * 100 + "%",
    top: (point.y / data.canvasHeight) * 100 + "%",
  };
}

// Builds an SVG path approximating the real building's outer silhouette:
// small rectangular notches stepped into all four corners (stairwells) and
// one concave curved indentation along the right edge (the staff-suite
// wing, next to Library/Kitchenette). Both floors share the same overall
// building footprint/canvas size, so one generic shape generator serves
// both floors rather than needing a hand-authored path per floor.
export function buildOutlinePath(canvasWidth, canvasHeight) {
  const notchW = Math.round(canvasWidth * 0.045);
  const notchH = Math.round(canvasHeight * 0.027);
  const curveStart = Math.round(canvasHeight * 0.43);
  const curveEnd = Math.round(canvasHeight * 0.7);
  const curveDepth = Math.round(canvasWidth * 0.045);
  const w = canvasWidth;
  const h = canvasHeight;

  return [
    `M 0,${notchH}`,
    `L ${notchW},${notchH}`,
    `L ${notchW},0`,
    `L ${w - notchW},0`,
    `L ${w - notchW},${notchH}`,
    `L ${w},${notchH}`,
    `L ${w},${curveStart}`,
    `Q ${w - curveDepth},${(curveStart + curveEnd) / 2} ${w},${curveEnd}`,
    `L ${w},${h - notchH}`,
    `L ${w - notchW},${h - notchH}`,
    `L ${w - notchW},${h}`,
    `L ${notchW},${h}`,
    `L ${notchW},${h - notchH}`,
    `L 0,${h - notchH}`,
    "Z",
  ].join(" ");
}
