import { percentStyle } from "../../utils/mapLayout";

// Non-reservable areas (Harvest Christian Academy tenant space, Hallway,
// Elevator markers, a small "Not Reservable" core). Blueprint-style
// outline (translucent fill, clear border) so these read as part of the
// floor plan's structure rather than opaque paint.
export default function ZoneBox({ zone, data }) {
  return (
    <div className="zone-box" style={percentStyle(zone, data)}>
      <span className="zone-label">{zone.label}</span>
    </div>
  );
}
