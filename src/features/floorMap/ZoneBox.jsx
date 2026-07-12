import { percentStyle } from "../../utils/mapLayout";

// Non-reservable/background areas: tenant zones (River Valley Christian
// School, Harvest Chapel Offices), the parking-garage + central-stairs
// core, staff suites, the kitchenette, storage, and the "kids wing"
// background band. `zone.color` (if present) paints the zone per the new
// reference floor plans' color scheme instead of the old neutral
// blueprint-style outline; `zone.textColor` overrides label text color to
// stay legible against that background. `zone.variant === "tint"` is for
// the kids-wing light-blue background band: a soft, borderless tint sitting
// behind the (still normally green/red, individually clickable) reservable
// rooms in that area, rather than a bordered "zone" box in its own right.
export default function ZoneBox({ zone, data }) {
  const style = percentStyle(zone, data);
  if (zone.color) {
    style.background = zone.color;
    style.borderColor = zone.color;
  }
  const isTint = zone.variant === "tint";

  return (
    <div className={"zone-box" + (isTint ? " zone-box-tint" : "")} style={style}>
      {zone.label && (
        <span
          className="zone-label"
          style={zone.textColor ? { color: zone.textColor, background: "transparent" } : undefined}
        >
          {zone.label}
        </span>
      )}
    </div>
  );
}
