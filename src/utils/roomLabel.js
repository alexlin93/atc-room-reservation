// The map is laid out with percentage-based positioning so it scales with
// the container's actual rendered width — which isn't reliably knowable at
// render time (e.g. the app may currently be gated/hidden behind sign-in,
// giving every element a 0px layout box). So label sizing/orientation is
// derived purely from each room's own w/h "map units" (consistent within a
// floor), approximated against the map's typical rendered width (bounded
// by main's max-width and padding).
const APPROX_RENDERED_CANVAS_PX_WIDTH = 1240;

export function computeRoomLabelStyle(room, data) {
  const scale = APPROX_RENDERED_CANVAS_PX_WIDTH / data.canvasWidth;
  const wPx = room.w * scale;
  const hPx = room.h * scale;
  const isVertical = room.h > room.w * 1.3;
  const minDim = Math.min(wPx, hPx);

  let fontPx;
  if (minDim < 25) fontPx = 8;
  else if (minDim < 35) fontPx = 9;
  else if (minDim < 55) fontPx = 10.5;
  else fontPx = 11.5;

  // Shrink further if the id text is still too long to fit along the axis
  // it reads along (vertical labels read along the box's height; horizontal
  // labels read along its width).
  const textLen = String(room.id).length;
  const lengthAxisPx = (isVertical ? hPx : wPx) - 6; // minus box padding
  const pxPerChar = fontPx * 0.62; // rough average glyph advance
  if (textLen * pxPerChar > lengthAxisPx && lengthAxisPx > 0) {
    fontPx = Math.max(6.5, lengthAxisPx / (textLen * 0.62));
  }

  return { isVertical, fontPx: Math.round(fontPx * 10) / 10 };
}
