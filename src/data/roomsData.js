// Room/floor layout data for Elgin Campus Building A, Floor 3 and Floor 4.
// Coordinates are in arbitrary "map units" laid out over each floor's
// canvasWidth x canvasHeight and rendered as percentages, so values only
// need to be roughly proportional to the source floor plan images — see
// utils/mapLayout.js (percentStyle/percentPoint) for the conversion, and
// utils/mapLayout.js's buildOutlinePath() for the shared building-silhouette
// shape (notched corners + one curved edge) drawn behind everything below.
//
// This is a full replacement of the room/zone list to match new, more
// detailed reference floor plans. The building's tenant signage changed
// from "Harvest Christian Academy" to "River Valley Christian School", and
// the previously-listed rooms (E302/E304/..., S3xx/S4xx suite numbers,
// "Conference Room", "Kid's Auditorium", room "313"/"312", etc.) have been
// superseded by the room lists below, which name every reservable space and
// non-reservable zone/marker visible on the new reference images.
//
// Reservability: every space that is a named, individually usable room is
// reservable (a `rooms` entry, plain green/red free-now/occupied-now
// coloring, clickable). Shared/utility/tenant/structural areas are
// non-reservable `zones` — tenant classroom space (River Valley Christian
// School), tenant office space (Harvest Chapel Offices), the parking
// garages + central stairs core, the staff suites (SIS/Bros — matching how
// "Staff Suite" was already treated as non-reservable in the prior version
// of this app), the kitchenette (shared break-room-style utility space, by
// the same reasoning the prior version used to exclude "Kids Desk" — a
// judgment call, flag for the user if they'd rather it be bookable), and
// Lakeside Storage (a storage room, not a bookable space). The "kids wing"
// cluster on floor 3 (Infant Room, Kids Room 1/2, Makerspace, Bibliopolis,
// Kids' Theatre, Lakeside Play Structure) sits on a light-blue background
// zone in the reference image, but those rooms ARE individually reservable
// — the light blue is a zone/area tint behind them, not a replacement for
// their own green/red status coloring, so they're listed as normal `rooms`
// with a separate non-interactive tint zone rendered behind them.
//
// Zone `color`/`textColor` map the reference images' color scheme (see
// ZoneBox.jsx): sage green for the school tenant zone, salmon for the
// chapel-offices tenant zone, dark navy w/ white text for the parking
// garages, central stairs, and staff-suite/utility zones, and a soft
// light-blue tint (no border, no label) for the kids-wing background band.
//
// `markers` are small non-interactive point icons (restrooms, elevators,
// water/R.O. water, first-aid, stairs, and an illustrative icon standing in
// for the "Lakeside Play Structure" photo, since no source image asset is
// available to embed) — see MapMarker.jsx.

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
      { id: "Staff Suite Conf Room", x: 1750, y: 600, w: 250, h: 160 },
      // Kids wing (sits on the light-blue tint zone above)
      { id: "Infant Room", x: 160, y: 1160, w: 180, h: 120 },
      { id: "Kids Room 1", x: 350, y: 1160, w: 180, h: 120 },
      { id: "Kids Room 2", x: 540, y: 1160, w: 180, h: 120 },
      { id: "Makerspace", x: 730, y: 1160, w: 180, h: 120 },
      { id: "Bibliopolis", x: 920, y: 1160, w: 180, h: 120 },
      { id: "Kids' Theatre", x: 160, y: 1300, w: 460, h: 120 },
      { id: "Lakeside Play Structure", x: 630, y: 1300, w: 470, h: 120 },
      // Telecommuting / Lakeside cluster to the right of the kids wing
      { id: "Telecommuting Offices", x: 1180, y: 1150, w: 540, h: 130 },
      { id: "Lakeside Living Room", x: 1180, y: 1300, w: 200, h: 120 },
      { id: "Telecommuting Bros", x: 1390, y: 1300, w: 160, h: 120 },
      { id: "Telecommuting SIS", x: 1560, y: 1300, w: 160, h: 120 },
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
      { id: "Library", x: 1750, y: 610, w: 250, h: 200 },
      { id: "Podcast", x: 1750, y: 1170, w: 250, h: 100 },
      { id: "4th Flr Living Room", x: 810, y: 1150, w: 430, h: 280 },
      { id: "Conf Room 3", x: 1260, y: 1150, w: 200, h: 280 },
      { id: "Conf Room 2", x: 1465, y: 1150, w: 130, h: 280 },
      { id: "Conf Room 1", x: 1600, y: 1150, w: 110, h: 280 },
    ],
  },
};

// Reservable hours of the day (24h clock). 7am - 9pm.
export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 21;
