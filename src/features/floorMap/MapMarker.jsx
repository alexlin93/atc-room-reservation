import { percentPoint } from "../../utils/mapLayout";

// Small point icon markers for building fixtures called out on the new
// reference floor plans (restrooms, elevators, water/R.O. water, first-aid,
// stairs, and the illustrative "Lakeside Play Structure" icon). These are
// purely informational/decorative: non-interactive (pointer-events: none,
// no click handler, not focusable) and rendered on top of zones/rooms so
// they stay visible, but clicks always pass through to whatever room/zone
// sits underneath.
const ICONS = {
  "bathroom-women": "\u{1F6BA}",
  "bathroom-men": "\u{1F6B9}",
  elevator: "\u{1F6D7}",
  water: "\u{1F6B0}",
  "first-aid": "⛑️",
  stairs: "\u{1FA9C}",
  "stairs-up": "⬆️",
  "stairs-down": "⬇️",
  playground: "\u{1F6DD}",
  // One of the 6 standard fixture-icon types called out on the reference
  // floor plans' legend (bathrooms, elevator, R.O. water, first-aid,
  // dumpster, stairs), added here so the type is renderable even though no
  // `markers` entry currently uses it — no dumpster was visible anywhere on
  // either floor's plan (it likely lives outside the visible floor area,
  // e.g. near an exterior loading dock), so no placement was guessed. See
  // roomsData.js's floor comments for the same note.
  dumpster: "\u{1F5D1}\u{FE0F}",
};

export default function MapMarker({ marker, data }) {
  const icon = ICONS[marker.type] || "•";
  return (
    <div className="map-marker" style={percentPoint(marker, data)} title={marker.title || marker.type}>
      <span className="map-marker-icon">{icon}</span>
      {marker.label && <span className="map-marker-label">{marker.label}</span>}
    </div>
  );
}
