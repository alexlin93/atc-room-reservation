import { FLOORS } from "../../data/roomsData";
import { currentReservation } from "../../utils/time";
import ZoneBox from "./ZoneBox";
import RoomBox from "./RoomBox";

// Renders the zone/room boxes for a given floor. Shared by the main map
// (pages/MainAppPage.jsx) and the My Reservations page's floor-plan visual
// (features/myReservations/MyReservationsMap.jsx), so there is exactly one
// place that knows how to turn roomsData into boxes on screen.
//
// props:
//   onRoomClick(floor, roomId) — called when a room box is activated.
//   highlightRoomIds — array of room ids to mark with the distinct
//     "room-box-mine" styling (used by My Reservations to call out the
//     signed-in user's own bookings).
export default function FloorMap({ floor, reservations, now, onRoomClick, highlightRoomIds, canvasId }) {
  const data = FLOORS[floor];
  if (!data) return null;

  return (
    <div
      className="map-canvas"
      id={canvasId}
      style={{ aspectRatio: `${data.canvasWidth} / ${data.canvasHeight}` }}
    >
      {data.zones.map((zone, i) => (
        <ZoneBox key={`zone-${i}`} zone={zone} data={data} />
      ))}

      {data.rooms.map((room) => {
        const occupied = !!currentReservation(reservations, floor, room.id, now);
        const isMine = !!(highlightRoomIds && highlightRoomIds.indexOf(room.id) !== -1);
        return (
          <RoomBox
            key={room.id}
            room={room}
            data={data}
            occupied={occupied}
            isMine={isMine}
            onActivate={() => onRoomClick(floor, room.id)}
          />
        );
      })}
    </div>
  );
}
