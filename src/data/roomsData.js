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
// and a placeholder `rooms` list (Library, Podcast, Conf Room 1-3, Infant
// Room, Kids Room 1-2, Makerspace, Bibliopolis, Kids' Theatre, Lakeside Play
// Structure, Telecommuting Offices, etc.) based on the wrong reference
// images. The product owner has since confirmed the tenant is "Harvest
// Christian Academy" and supplied the correct Floor 3 / Floor 4 plans, which
// match the room codes this app used *before* that rebuild (E302, S3xx/S4xx
// suite numbers, "Conference Room", "Kid's Auditorium", "313"/"312", etc).
// This revision replaces only the `rooms` arrays (and their on-canvas
// positions) below with that corrected, real room list — the `zones` and
// `markers` arrays, and the color scheme they describe, are unchanged and
// still accurate, so their descriptions below are unchanged too.
//
// Room placement note: the real room list is described (by the product
// owner, from the reference images) as a stack of small rooms running down
// the east/right wall and a row of small rooms along the south/bottom wall,
// per floor. On this rebuild's canvas, the east-wall column (x ~1750-2000)
// is already occupied top-to-bottom by the (correct, out-of-scope) SIS
// Staff Suite / Kitchenette / Bros Staff Suite / Lakeside Storage zones, so
// the east-wall rooms below are fit into the gaps between those zones (and
// into the open strip past the last one, toward the SE corner) rather than
// literally spanning the full wall height in one unbroken column. The
// south-wall row and the larger bottom-of-floor rooms (Kid's Auditorium,
// Lakeside Living Room, 313/312) sit in the open band below the parking
// garages/central stairs, same as the (now-removed) placeholder rooms did.
// All positions are a best-effort approximation of relative layout (rows,
// stacks, adjacency) transcribed from a description of the reference
// images — not measured pixel coordinates.
//
// Reservability: every space that is a named, individually usable room is
// reservable (a `rooms` entry, plain green/red free-now/occupied-now
// coloring, clickable). Shared/utility/tenant/structural areas are
// non-reservable `zones` — tenant classroom space (Harvest Christian
// Academy), tenant office space (Harvest Chapel Offices), the parking
// garages + central stairs core, the staff suites (SIS/Bros — matching how
// "Staff Suite" was already treated as non-reservable in the prior version
// of this app), the kitchenette (shared break-room-style utility space, by
// the same reasoning the prior version used to exclude "Kids Desk" — a
// judgment call, flag for the user if they'd rather it be bookable), and
// Lakeside Storage (a storage room, not a bookable space).
//
// Zone `color`/`textColor` map the reference images' color scheme (see
// ZoneBox.jsx): sage green for the school tenant zone, salmon for the
// chapel-offices tenant zone, dark navy w/ white text for the parking
// garages, central stairs, and staff-suite/utility zones, and a soft
// light-blue tint (no border, no label) for the background band behind the
// floor-3 bottom-of-floor room cluster (Kid's Auditorium, Lakeside Living
// Room, 313/312, and the tail end of the south-wall row) — unchanged from
// the prior revision, just now sitting behind the corrected room set
// instead of the placeholder "kids wing" rooms.
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
// a separate pass is auditing marker placement in this same file.

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
      { label: "SIS Staff Suite", x: 1750, y: 370, w: 250, h: 220, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Kitchenette", x: 1750, y: 770, w: 250, h: 110, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Bros Staff Suite", x: 1750, y: 930, w: 250, h: 220, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Lakeside Storage", x: 1750, y: 1160, w: 250, h: 120, color: CORE_NAVY, textColor: WHITE_TEXT },
      // Non-interactive background tint behind the kids-wing room cluster
      // below — not a bordered/labeled zone like the others, just the
      // light-blue area tint from the reference image.
      { label: "", x: 140, y: 1140, w: 1020, h: 300, color: KIDSWING_BLUE, variant: "tint" },
    ],
    markers: [
      { type: "elevator", x: 930, y: 430 },
      { type: "elevator", x: 930, y: 1050 },
      { type: "bathroom-women", x: 830, y: 1050 },
      { type: "bathroom-men", x: 1030, y: 1050 },
      { type: "water", x: 1875, y: 825 },
      { type: "first-aid", x: 1830, y: 480 },
      { type: "stairs-up", x: 1830, y: 680, label: "FL 4" },
      { type: "playground", x: 865, y: 1360 },
    ],
    rooms: [
      // East wall, top group: small rooms stacked in the gap between the
      // SIS Staff Suite and Kitchenette zones (x1750-2000, y595-764). Two
      // columns x three rows. AA225 (a small triangular/alcove room in the
      // source image) sits nearest the "stairs-up" marker at (1830, 680).
      { id: "E302", x: 1750, y: 595, w: 120, h: 53 },
      { id: "E304", x: 1880, y: 595, w: 120, h: 53 },
      // E306/E308 leave a clear gap at x1810-1845 through this row so the
      // "stairs-up" marker at (1830, 680) lands in open space rather than
      // on top of either box.
      { id: "E306", x: 1750, y: 653, w: 60, h: 53 },
      { id: "E308", x: 1845, y: 653, w: 155, h: 53 },
      { id: "AA225", x: 1750, y: 711, w: 120, h: 53 },
      { id: "E310", x: 1880, y: 711, w: 120, h: 53 },
      // East wall, continuing down: the large Conference Room (rotated
      // label via the existing vertical-label convention, h > w * 1.3) plus
      // E316-E324, in the open strip past Lakeside Storage, toward the SE
      // corner (near the S356/S352 pair and the tail of the south row).
      { id: "Conference Room", x: 1750, y: 1285, w: 80, h: 215 },
      { id: "E316", x: 1830, y: 1285, w: 170, h: 43 },
      { id: "E318", x: 1830, y: 1328, w: 170, h: 43 },
      { id: "E320", x: 1830, y: 1371, w: 170, h: 43 },
      { id: "E322", x: 1830, y: 1414, w: 170, h: 43 },
      { id: "E324", x: 1830, y: 1457, w: 170, h: 43 },
      // South wall row (left to right), below the parking garages/stairs.
      { id: "S377", x: 140, y: 1140, w: 95, h: 80 },
      { id: "S375", x: 245, y: 1140, w: 95, h: 80 },
      { id: "S373", x: 350, y: 1140, w: 95, h: 80 },
      { id: "S371", x: 455, y: 1140, w: 95, h: 80 },
      { id: "S369", x: 560, y: 1140, w: 95, h: 80 },
      { id: "S367", x: 665, y: 1140, w: 95, h: 80 },
      { id: "S365", x: 770, y: 1140, w: 95, h: 80 },
      { id: "S363", x: 875, y: 1140, w: 95, h: 80 },
      { id: "S361", x: 980, y: 1140, w: 95, h: 80 },
      { id: "S359", x: 1085, y: 1140, w: 95, h: 80 },
      { id: "S357", x: 1190, y: 1140, w: 95, h: 80 },
      // Two more small rooms continuing the row toward the SE corner,
      // between the row and the Conference Room/E324 area.
      { id: "S356", x: 1310, y: 1140, w: 95, h: 80 },
      { id: "S352", x: 1420, y: 1140, w: 95, h: 80 },
      // Bottom-of-floor cluster: Kid's Auditorium (bottom-left, large — the
      // decorative arch in the source image is cosmetic and not
      // replicated), Lakeside Living Room, and small rooms 313/312.
      { id: "Kid's Auditorium", x: 140, y: 1240, w: 460, h: 200 },
      { id: "Lakeside Living Room", x: 650, y: 1240, w: 300, h: 200 },
      { id: "313", x: 970, y: 1240, w: 140, h: 200 },
      { id: "312", x: 1130, y: 1240, w: 140, h: 200 },
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
      { label: "SIS Staff Suite", x: 1750, y: 370, w: 250, h: 230, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Kitchenette", x: 1750, y: 820, w: 250, h: 100, color: CORE_NAVY, textColor: WHITE_TEXT },
      { label: "Bros Staff Suite", x: 1750, y: 930, w: 250, h: 230, color: CORE_NAVY, textColor: WHITE_TEXT },
      // Non-interactive suite/pod group labels below the south-wall room
      // row (see file header note) — not individually bookable rooms.
      { label: "S468", x: 800, y: 1235, w: 415, h: 70 },
      { label: "S469", x: 1215, y: 1235, w: 415, h: 70 },
    ],
    markers: [
      { type: "stairs", x: 930, y: 430 },
      { type: "bathroom-women", x: 840, y: 1050 },
      { type: "bathroom-men", x: 930, y: 1050 },
      { type: "elevator", x: 1020, y: 1050 },
      { type: "water", x: 1875, y: 870 },
      { type: "stairs-down", x: 1875, y: 1310, label: "FL 3" },
    ],
    rooms: [
      // East wall, top group: small rooms stacked in the gap between the
      // SIS Staff Suite and Kitchenette zones (x1750-2000, y605-809). Two
      // columns; 411/412 (top-right corner), then E402-E406, then the
      // curved-wall nook rooms E406A/E405B.
      { id: "411", x: 1750, y: 605, w: 120, h: 48 },
      { id: "412", x: 1880, y: 605, w: 120, h: 48 },
      { id: "E402", x: 1750, y: 657, w: 120, h: 48 },
      { id: "E404", x: 1880, y: 657, w: 120, h: 48 },
      { id: "E406", x: 1750, y: 709, w: 250, h: 48 },
      { id: "E406A", x: 1750, y: 761, w: 120, h: 48 },
      { id: "E405B", x: 1880, y: 761, w: 120, h: 48 },
      // East wall, continuing down the curve, in the open strip below the
      // Bros Staff Suite zone: E410 (a fixture/icon marker sits near it in
      // the source image — unrelated to this room box) through E418.
      { id: "E410", x: 1750, y: 1165, w: 250, h: 55 },
      { id: "E412A", x: 1750, y: 1225, w: 120, h: 55 },
      { id: "E412B", x: 1880, y: 1225, w: 120, h: 55 },
      { id: "E414", x: 1750, y: 1285, w: 250, h: 55 },
      { id: "E416", x: 1750, y: 1345, w: 250, h: 55 },
      { id: "E418", x: 1750, y: 1405, w: 250, h: 55 },
      // South wall row (left to right), mirroring floor 3's row of 11, plus
      // S451 continuing the row (mirrors floor 3's S352 relative position).
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
