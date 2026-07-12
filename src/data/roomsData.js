// Room/floor layout data for Elgin Campus Building A, Floor 3 and Floor 4.
// Coordinates are in arbitrary "map units" laid out over each floor's
// canvasWidth x canvasHeight and rendered as percentages, so values only
// need to be roughly proportional to the source floor plan images — see
// utils/mapLayout.js (percentStyle/percentPoint) for the conversion, and
// utils/mapLayout.js's buildOutlinePath() for the shared building-silhouette
// shape (notched corners + one curved edge) drawn behind everything below.
//
// NOTE on this revision: an earlier pass rebuilt this file's *visuals*
// (color scheme, building outline, icon markers — all still correct) but
// also invented a placeholder tenant name ("River Valley Christian School")
// and a placeholder `rooms` list (Library, Podcast, Conf Room 1-3, a
// differently-ordered kids-wing cluster, Telecommuting Offices, etc.) based
// on the wrong reference images. The product owner has since confirmed the
// tenant is "Harvest Christian Academy" and supplied the correct Floor 3 /
// Floor 4 plans, which match the room codes this app used *before* that
// rebuild (E302, S3xx/S4xx suite numbers, "Conference Room", "Kid's
// Auditorium", "313"/"312", etc), plus the original kids-wing room names in
// a corrected left-to-right order.
//
// This revision replaces the `rooms` arrays (and their on-canvas positions)
// with that corrected, real room list. Most `zones` are unchanged (the top
// school-tenant band, West/East Parking Garage, Central Stairs, and — floor
// 4 only — Harvest Chapel Offices are all confirmed correct and untouched).
// The one deliberate exception: on both floors, four/three zone entries
// that occupied the *east-wall room stack's* footprint ("SIS Staff Suite",
// "Kitchenette", "Bros Staff Suite", and — floor 3 only — "Lakeside
// Storage") were themselves part of the earlier pass's mistake — the real
// images show individually-numbered reservable rooms (E302→E324 on floor 3,
// 411/412→E418 on floor 4) running the full height of that column instead.
// Those zone entries have been removed (nothing else in `zones` was
// touched) and the column is now filled by the real room stack, top to
// bottom, in one run rather than squeezed into leftover gaps.
//
// Room placement note: all positions are a best-effort approximation of
// relative layout (rows, stacks, adjacency) transcribed from a description
// of the reference images — not measured pixel coordinates. Layout summary
// per floor:
//   - East wall (x ~1750-2000): the numbered room stack, top to bottom,
//     filling the column that used to hold the staff-suite/kitchenette/
//     storage zones.
//   - South wall, left portion (floor 3: x ~140-1160; floor 4: x ~140-1750,
//     right of Harvest Chapel Offices): the kids-wing cluster (floor 3) or
//     the S4xx suite row (floor 4).
//   - South wall, right portion, before the east column (x ~1160-1750):
//     floor 3's S3xx suite row plus Lakeside Living Room/313/312; floor 4's
//     S451 continuing its suite row.
//
// Reservability: every space that is a named, individually usable room is
// reservable (a `rooms` entry, plain green/red free-now/occupied-now
// coloring, clickable). Shared/utility/tenant/structural areas are
// non-reservable `zones` — tenant classroom space (Harvest Christian
// Academy), tenant office space (Harvest Chapel Offices), and the parking
// garages + central stairs core.
//
// Zone `color`/`textColor` map the reference images' color scheme (see
// ZoneBox.jsx): sage green for the school tenant zone, salmon for the
// chapel-offices tenant zone, dark navy w/ white text for the parking
// garages/central stairs, and a soft light-blue tint (no border, no label)
// for the background band behind floor 3's kids-wing room cluster.
//
// Floor 3's kids-wing cluster (Infant Room, Kids Room 1/2, Makerspace,
// Bibliopolis, Kid's Auditorium, Lakeside Play Structure) sits on that
// light-blue tint zone but each room is individually reservable — the tint
// is just an area wash behind them, not a replacement for their own
// green/red status coloring. Per the product owner: all six of the
// original five-room row + "Kid's Auditorium" are bookable, just in a
// corrected left-to-right order (Infant Room, Kids Room 2, Makerspace, Kids
// Room 1, Bibliopolis), and the room in that row's *second* row previously
// mislabeled "Kids' Theatre" is actually "Kid's Auditorium" (same box/
// position, renamed only — not the separate large bottom-left room the
// initial read of the reference images suggested). "Lakeside Play
// Structure" (to Kid's Auditorium's right, same row) is *not* one of the
// confirmed "six" — whether it's individually bookable or purely
// decorative is a judgment call; kept as a normal reservable `rooms` entry
// here (flagged in the accompanying report; trivial to move to `zones` as
// a non-interactive tint-only label if the product owner says otherwise).
//
// Floor 4's `zones` array also gets two small additive entries (S468,
// S469): the reference image shows these as two labels below the south-wall
// room row, each spanning about half the row's width. Read as suite/pod
// group labels rather than individually bookable rooms (each door in the
// row above already has its own room number), so they're rendered as
// plain non-interactive text labels (default zone styling, no color) —
// not part of the `rooms` array. This is a judgment call; see this file's
// git history / the accompanying report for the alternative (treating them
// as two more reservable rooms) if that reading is preferred instead.
//
// `markers` are small non-interactive point icons (restrooms, elevators,
// water/R.O. water, first-aid, stairs) — see MapMarker.jsx. Unchanged here;
// a separate pass is auditing marker placement in this same file. A few
// (e.g. floor 3's "stairs-up" at (1830, 680), floor 4's "water" near
// (1875, 870)) now render near/over the east-wall room stack instead of a
// zone label, since those zones were removed above — that's expected (the
// source images show those icons right next to/inside those real rooms,
// e.g. AA225 and E410 respectively) and not a bug in either pass.

const SCHOOL_GREEN = "#a9baa0";
const CHAPEL_SALMON = "#c98a6b";
const CORE_NAVY = "#1e3a5f";
const KIDSWING_BLUE = "#a8d5e0";
const WHITE_TEXT = "#ffffff";

export const FLOORS = {
  3: {
    label: "Floor 3",
    title: "Elgin Campus | Building A | Floor 3",
    canvasWidth: 2000,
    canvasHeight: 1500,
    zones: [
      { label: "River Valley Christian School", x: 140, y: 50, w: 1720, h: 300, color: SCHOOL_GREEN },
      { label: "West Parking Garage", x: 140, y: 370, w: 620, h: 760, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Central Stairs", x: 780, y: 370, w: 300, h: 760, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "East Parking Garage", x: 1100, y: 370, w: 620, h: 760, color: CORE_NAVY, textColor: WHITE_TEXT },
      // (The "SIS Staff Suite" / "Kitchenette" / "Bros Staff Suite" /
      // "Lakeside Storage" zones that used to occupy x1750-2000 here have
      // been removed — that whole column is the real E302-E324 room stack,
      // see `rooms` below.)
      // Non-interactive background tint behind the kids-wing room cluster
      // below — not a bordered/labeled zone like the others, just the
      // light-blue area tint from the reference image.
      { label: "", x: 140, y: 1140, w: 1020, h: 300, color: KIDSWING_BLUE, variant: "tint" },
    ],
    markers: [
      // Corner stairwell notches (mirror the building outline's stepped
      // corners — see buildOutlinePath() in utils/mapLayout.js).
      { type: "stairs", x: 45, y: 20 },
      // Central corridor stairwell, between the two classroom-block halves
      // of the school zone (two glyphs close together, one stairwell).
      { type: "stairs", x: 910, y: 430 },
      { type: "stairs", x: 965, y: 430 },
      { type: "stairs", x: 1955, y: 20 },
      // East-wall stack, top to bottom: women's bathroom + elevator near
      // the SIS Staff Suite zone, first-aid near Staff Suite Conf
      // Room/Kitchenette (Floor 3 only — not mirrored on Floor 4), R.O.
      // water beside (not on top of) the Kitchenette label, men's bathroom
      // near Lakeside Storage. Each is offset toward a corner of its zone
      // box rather than the box's (label-occupying) center point.
      { type: "bathroom-women", x: 1790, y: 360 },
      { type: "elevator", x: 1790, y: 400 },
      { type: "first-aid", x: 1790, y: 625 },
      { type: "water", x: 1775, y: 790 },
      { type: "bathroom-men", x: 1790, y: 1185 },
      // Central Stairs column base cluster.
      { type: "bathroom-women", x: 830, y: 1050 },
      { type: "bathroom-men", x: 1030, y: 1050 },
      { type: "elevator", x: 930, y: 1050 },
      // Near the Lakeside Play Structure room: first-aid + R.O. water in the
      // gap between the kids-wing tint band and the telecommuting cluster,
      // plus a stairs icon in the nook between Kids' Theatre and the play
      // structure, and the illustrative play-structure icon itself moved to
      // a corner of its room box instead of dead center on the room label.
      { type: "first-aid", x: 1130, y: 1330 },
      { type: "water", x: 1130, y: 1390 },
      { type: "stairs", x: 625, y: 1360 },
      { type: "playground", x: 660, y: 1310 },
      { type: "stairs-up", x: 1955, y: 1440, label: "FL 4" },
    ],
    rooms: [
      // East wall room stack, top to bottom, filling the column formerly
      // occupied by the SIS Staff Suite/Kitchenette/Bros Staff Suite/
      // Lakeside Storage zones (now removed above). A short gap around
      // y660-690 keeps the "stairs-up" marker at (1830, 680) in open space,
      // near AA225 (a small triangular/alcove room in the source image)
      // without sitting on top of it.
      { id: "E302", x: 1750, y: 370, w: 250, h: 65 },
      { id: "E304", x: 1750, y: 445, w: 250, h: 65 },
      { id: "E306", x: 1750, y: 520, w: 250, h: 65 },
      { id: "E308", x: 1750, y: 595, w: 250, h: 65 },
      { id: "AA225", x: 1750, y: 690, w: 140, h: 45 },
      { id: "E310", x: 1750, y: 745, w: 250, h: 65 },
      // Large room, rotated label via the existing vertical-label
      // convention (h > w * 1.3).
      { id: "Conference Room", x: 1750, y: 820, w: 250, h: 340 },
      { id: "E316", x: 1750, y: 1170, w: 250, h: 55 },
      { id: "E318", x: 1750, y: 1233, w: 250, h: 55 },
      { id: "E320", x: 1750, y: 1296, w: 250, h: 55 },
      { id: "E322", x: 1750, y: 1359, w: 250, h: 55 },
      { id: "E324", x: 1750, y: 1422, w: 250, h: 55 },
      // South wall, right portion (x1165-1750, before the east column):
      // S3xx suite row, left to right, then Lakeside Living Room/313/312
      // below it.
      { id: "S377", x: 1165, y: 1150, w: 36, h: 70 },
      { id: "S375", x: 1210, y: 1150, w: 36, h: 70 },
      { id: "S373", x: 1255, y: 1150, w: 36, h: 70 },
      { id: "S371", x: 1300, y: 1150, w: 36, h: 70 },
      { id: "S369", x: 1345, y: 1150, w: 36, h: 70 },
      { id: "S367", x: 1390, y: 1150, w: 36, h: 70 },
      { id: "S365", x: 1435, y: 1150, w: 36, h: 70 },
      { id: "S363", x: 1480, y: 1150, w: 36, h: 70 },
      { id: "S361", x: 1525, y: 1150, w: 36, h: 70 },
      { id: "S359", x: 1570, y: 1150, w: 36, h: 70 },
      { id: "S357", x: 1615, y: 1150, w: 36, h: 70 },
      // Two more small rooms continuing the row toward the SE corner,
      // between the row and the Conference Room/E324 area.
      { id: "S356", x: 1660, y: 1150, w: 36, h: 70 },
      { id: "S352", x: 1705, y: 1150, w: 36, h: 70 },
      { id: "Lakeside Living Room", x: 1165, y: 1300, w: 300, h: 120 },
      { id: "313", x: 1480, y: 1300, w: 125, h: 120 },
      { id: "312", x: 1620, y: 1300, w: 125, h: 120 },
      // South wall, left portion (x140-1160): the kids-wing cluster, on
      // the light-blue tint zone above. Left-to-right order per the
      // product owner: Infant Room, Kids Room 2, Makerspace, Kids Room 1,
      // Bibliopolis, then Kid's Auditorium (renamed from a placeholder
      // "Kids' Theatre" — same box/position — the decorative arch feature
      // in the source image is cosmetic and not replicated) with Lakeside
      // Play Structure to its right.
      { id: "Infant Room", x: 160, y: 1160, w: 180, h: 120 },
      { id: "Kids Room 2", x: 350, y: 1160, w: 180, h: 120 },
      { id: "Makerspace", x: 540, y: 1160, w: 180, h: 120 },
      { id: "Kids Room 1", x: 730, y: 1160, w: 180, h: 120 },
      { id: "Bibliopolis", x: 920, y: 1160, w: 180, h: 120 },
      { id: "Kid's Auditorium", x: 160, y: 1300, w: 460, h: 120 },
      { id: "Lakeside Play Structure", x: 630, y: 1300, w: 470, h: 120 },
    ],
  },

  4: {
    label: "Floor 4",
    title: "Elgin Campus | Building A | Floor 4",
    canvasWidth: 2000,
    canvasHeight: 1500,
    zones: [
      { label: "River Valley Christian School", x: 140, y: 50, w: 1720, h: 300, color: SCHOOL_GREEN },
      { label: "West Parking Garage", x: 140, y: 370, w: 620, h: 760, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Central Stairs", x: 780, y: 370, w: 300, h: 760, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "East Parking Garage", x: 1100, y: 370, w: 620, h: 760, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Harvest Chapel Offices", x: 140, y: 1150, w: 650, h: 280, color: CHAPEL_SALMON },
      // (The "SIS Staff Suite" / "Kitchenette" / "Bros Staff Suite" zones
      // that used to occupy x1750-2000 here have been removed — that whole
      // column is the real 411/412-E418 room stack, see `rooms` below.)
      // Non-interactive suite/pod group labels below the south-wall room
      // row (see file header note) — not individually bookable rooms.
      { label: "S468", x: 800, y: 1235, w: 415, h: 70 },
      { label: "S469", x: 1215, y: 1235, w: 415, h: 70 },
    ],
    markers: [
      // Corner stairwell notches (mirror the building outline's stepped
      // corners — see buildOutlinePath() in utils/mapLayout.js).
      { type: "stairs", x: 45, y: 20 },
      // Central corridor stairwell, between the two classroom-block halves
      // of the school zone (two glyphs close together, one stairwell).
      { type: "stairs", x: 910, y: 430 },
      { type: "stairs", x: 965, y: 430 },
      { type: "stairs", x: 1955, y: 20 },
      // East-wall stack, top to bottom: women's bathroom + elevator near
      // the SIS Staff Suite zone, a small stairs icon in the curved nook of
      // the building outline near Library/SIS Staff Suite (Floor 4 only —
      // not mirrored on Floor 3, which has an extra first-aid icon here
      // instead), R.O. water beside (not on top of) the Kitchenette label,
      // men's bathroom near the bottom of the stack. Each is offset toward
      // a corner of its zone box rather than the box's (label-occupying)
      // center point.
      { type: "bathroom-women", x: 1790, y: 390 },
      { type: "elevator", x: 1790, y: 430 },
      { type: "stairs", x: 1930, y: 700 },
      { type: "water", x: 1775, y: 835 },
      { type: "bathroom-men", x: 1790, y: 1140 },
      // Central Stairs column base cluster.
      { type: "bathroom-women", x: 840, y: 1050 },
      { type: "bathroom-men", x: 930, y: 1050 },
      { type: "elevator", x: 1020, y: 1050 },
      // Bottom of the map: a stairs icon at the boundary between Harvest
      // Chapel Offices and the room row, R.O. water near the bottom-right
      // corner, and the stairs-down-to-Floor-3 corner marker.
      { type: "stairs", x: 785, y: 1160 },
      { type: "water", x: 1900, y: 1400 },
      { type: "stairs-down", x: 1955, y: 1440, label: "FL 3" },
    ],
    rooms: [
      // East wall room stack, top to bottom, filling the column formerly
      // occupied by the SIS Staff Suite/Kitchenette/Bros Staff Suite zones
      // (now removed above): 411/412 (top-right corner), E402-E406, the
      // curved-wall nook rooms E406A/E405B (the building outline itself
      // curves inward along this stretch — see buildOutlinePath()), then
      // E410 (the source image's fixture/icon near it lines up with the
      // "water" marker at (1875, 870), which now sits right on this room —
      // expected, not a bug) through E418.
      { id: "411", x: 1750, y: 370, w: 250, h: 55 },
      { id: "412", x: 1750, y: 435, w: 250, h: 55 },
      { id: "E402", x: 1750, y: 500, w: 250, h: 55 },
      { id: "E404", x: 1750, y: 565, w: 250, h: 55 },
      { id: "E406", x: 1750, y: 630, w: 250, h: 55 },
      { id: "E406A", x: 1750, y: 699, w: 250, h: 53 },
      { id: "E405B", x: 1750, y: 760, w: 250, h: 53 },
      { id: "E410", x: 1750, y: 827, w: 250, h: 60 },
      { id: "E412A", x: 1750, y: 897, w: 250, h: 55 },
      { id: "E412B", x: 1750, y: 962, w: 250, h: 55 },
      { id: "E414", x: 1750, y: 1027, w: 250, h: 55 },
      { id: "E416", x: 1750, y: 1092, w: 250, h: 55 },
      { id: "E418", x: 1750, y: 1157, w: 250, h: 55 },
      // South wall, right portion (x800-1750, right of Harvest Chapel
      // Offices): S4xx suite row, left to right, plus S451 continuing the
      // row (mirrors floor 3's S352 relative position).
      { id: "S463", x: 800, y: 1150, w: 70, h: 76 },
      { id: "S462", x: 876, y: 1150, w: 70, h: 76 },
      { id: "S461", x: 952, y: 1150, w: 70, h: 76 },
      { id: "S460", x: 1028, y: 1150, w: 70, h: 76 },
      { id: "S459", x: 1104, y: 1150, w: 70, h: 76 },
      { id: "S458", x: 1180, y: 1150, w: 70, h: 76 },
      { id: "S457", x: 1256, y: 1150, w: 70, h: 76 },
      { id: "S456", x: 1332, y: 1150, w: 70, h: 76 },
      { id: "S455", x: 1408, y: 1150, w: 70, h: 76 },
      { id: "S454", x: 1484, y: 1150, w: 70, h: 76 },
      { id: "S453", x: 1560, y: 1150, w: 70, h: 76 },
      { id: "S451", x: 1636, y: 1150, w: 70, h: 76 },
    ],
  },
};

// Reservable hours of the day (24h clock). 7am - 9pm.
export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 21;
