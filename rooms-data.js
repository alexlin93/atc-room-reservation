// Room/floor layout data for Elgin Campus Building A, Floor 3 and Floor 4.
// Coordinates are in arbitrary "map units" laid out over each floor's
// canvasWidth x canvasHeight and rendered as percentages, so values only
// need to be roughly proportional to the source floor plan images.
//
// Only spaces that carry a specific name/number on the map are reservable
// (the Staff Suite offices, the small suite offices along the bottom, the
// Conference Room, Kid's Auditorium, and Lakeside Living Room). The
// unlabeled classroom rows (Harvest Christian Academy tenant space) and
// the unlabeled central core (stairs/elevators/restrooms/open areas) are
// not reservable.

const FLOORS = {
  3: {
    label: "Floor 3",
    title: "Elgin Campus | Building A | Floor 3",
    canvasWidth: 2000,
    canvasHeight: 1500,
    zones: [
      { label: "Harvest Christian Academy", x: 160, y: 340, w: 1440, h: 280 },
      { label: "Not Reservable", x: 160, y: 620, w: 1400, h: 610 },
      { label: "Not Reservable", x: 600, y: 1310, w: 160, h: 130 },
    ],
    rooms: [
      // Staff Suite column
      { id: "E302", x: 1620, y: 600, w: 90, h: 55 },
      { id: "E304", x: 1620, y: 655, w: 90, h: 55 },
      { id: "E306", x: 1620, y: 710, w: 90, h: 50 },
      { id: "E308", x: 1620, y: 760, w: 90, h: 45 },
      { id: "E310", x: 1620, y: 805, w: 90, h: 45 },
      { id: "AA225", x: 1550, y: 805, w: 65, h: 60 },
      { id: "Conference Room", x: 1715, y: 600, w: 90, h: 400 },
      { id: "E316", x: 1620, y: 1000, w: 90, h: 45 },
      { id: "E318", x: 1620, y: 1045, w: 90, h: 45 },
      { id: "E320", x: 1620, y: 1090, w: 90, h: 45 },
      { id: "E322", x: 1620, y: 1135, w: 90, h: 45 },
      { id: "E324", x: 1620, y: 1180, w: 90, h: 45 },
      // Bottom suite offices
      { id: "S377", x: 1030, y: 1240, w: 35, h: 60 },
      { id: "S375", x: 1065, y: 1240, w: 35, h: 60 },
      { id: "S373", x: 1100, y: 1240, w: 30, h: 60 },
      { id: "S371", x: 1130, y: 1240, w: 25, h: 60 },
      { id: "S369", x: 1155, y: 1240, w: 30, h: 60 },
      { id: "S367", x: 1185, y: 1240, w: 30, h: 60 },
      { id: "S365", x: 1215, y: 1240, w: 30, h: 60 },
      { id: "S363", x: 1245, y: 1240, w: 30, h: 60 },
      { id: "S361", x: 1275, y: 1240, w: 30, h: 60 },
      { id: "S359", x: 1305, y: 1240, w: 35, h: 60 },
      { id: "S357", x: 1340, y: 1240, w: 50, h: 30 },
      { id: "S356", x: 1340, y: 1270, w: 50, h: 30 },
      { id: "S352", x: 1395, y: 1240, w: 60, h: 60 },
      // Bottom-most row
      { id: "Kid's Auditorium", x: 280, y: 1310, w: 320, h: 130 },
      { id: "Lakeside Living Room", x: 1000, y: 1310, w: 220, h: 130 },
      { id: "313", x: 1350, y: 1310, w: 90, h: 130 },
      { id: "312", x: 1440, y: 1310, w: 90, h: 130 },
    ],
  },

  4: {
    label: "Floor 4",
    title: "Elgin Campus | Building A | Floor 4",
    canvasWidth: 2000,
    canvasHeight: 1500,
    zones: [
      { label: "Harvest Christian Academy", x: 160, y: 340, w: 1440, h: 280 },
      { label: "Not Reservable", x: 160, y: 620, w: 1400, h: 610 },
      { label: "Not Reservable", x: 280, y: 1240, w: 700, h: 150 },
    ],
    rooms: [
      // Staff Suite column
      { id: "411", x: 1615, y: 600, w: 60, h: 45 },
      { id: "412", x: 1615, y: 645, w: 60, h: 45 },
      { id: "E402", x: 1685, y: 600, w: 95, h: 55 },
      { id: "E404", x: 1685, y: 655, w: 95, h: 55 },
      { id: "E406", x: 1685, y: 710, w: 95, h: 45 },
      { id: "E405B", x: 1615, y: 755, w: 80, h: 45 },
      { id: "E406A", x: 1615, y: 800, w: 80, h: 45 },
      { id: "E410", x: 1615, y: 850, w: 150, h: 120 },
      { id: "E412A", x: 1615, y: 1015, w: 80, h: 45 },
      { id: "E412B", x: 1615, y: 1060, w: 80, h: 45 },
      { id: "E414", x: 1685, y: 1105, w: 95, h: 45 },
      { id: "E416", x: 1685, y: 1150, w: 95, h: 45 },
      { id: "E418", x: 1685, y: 1195, w: 95, h: 45 },
      // Bottom suite offices
      { id: "S463", x: 1005, y: 1270, w: 40, h: 55 },
      { id: "S462", x: 1045, y: 1270, w: 35, h: 55 },
      { id: "S461", x: 1080, y: 1270, w: 35, h: 55 },
      { id: "S460", x: 1115, y: 1270, w: 35, h: 55 },
      { id: "S459", x: 1150, y: 1270, w: 35, h: 55 },
      { id: "S458", x: 1185, y: 1270, w: 35, h: 55 },
      { id: "S457", x: 1220, y: 1270, w: 35, h: 55 },
      { id: "S456", x: 1255, y: 1270, w: 35, h: 55 },
      { id: "S455", x: 1290, y: 1270, w: 35, h: 55 },
      { id: "S454", x: 1325, y: 1270, w: 35, h: 55 },
      { id: "S453", x: 1360, y: 1270, w: 35, h: 55 },
      { id: "S451", x: 1560, y: 1270, w: 110, h: 90 },
    ],
  },
};

// Reservable hours of the day (24h clock). 7am - 9pm.
const OPEN_HOUR = 7;
const CLOSE_HOUR = 21;
