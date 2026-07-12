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
