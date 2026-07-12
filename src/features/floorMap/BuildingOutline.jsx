import { buildOutlinePath } from "../../utils/mapLayout";

// A subtle outline/border layer sitting behind all zones/rooms, tracing an
// approximation of the real building's outer silhouette (notched corners at
// all four stairwells, a curved indentation on the right side by the
// staff-suite wing) rather than a plain rectangle. Purely decorative —
// non-interactive, and not intended to be pixel-accurate against the source
// floor plan (see roomsData.js's header comment).
export default function BuildingOutline({ data }) {
  const d = buildOutlinePath(data.canvasWidth, data.canvasHeight);
  return (
    <svg
      className="building-outline"
      viewBox={`0 0 ${data.canvasWidth} ${data.canvasHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
