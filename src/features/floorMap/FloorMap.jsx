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
//   isRoomReservable(floor, roomId) — optional; admin room-toggle feature
//     (see hooks/useRoomOverrides.js). Defaults to always-reservable when
//     omitted, so existing callers are unaffected. A room an admin has
//     marked unreservable renders greyed-out for everyone, and its normal
//     click-to-reserve behavior is skipped for non-admins (admins can still
//     click through, e.g. to toggle it back on via the room modal).
//   isAdmin — optional, default false; see isRoomReservable above.
export default function FloorMap({
  floor,
  reservations,
  now,
  onRoomClick,
  highlightRoomIds,
  canvasId,
  isRoomReservable,
  isAdmin,
}) {
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
        const reservable = isRoomReservable ? isRoomReservable(floor, room.id) : true;
        return (
          <RoomBox
            key={room.id}
            room={room}
            data={data}
            occupied={occupied}
            isMine={isMine}
            isReservable={reservable}
            onActivate={() => {
              // A non-admin can't do anything useful in the modal for a
              // room an admin has taken offline, so skip opening it at all;
              // an admin still needs to reach it (e.g. to toggle it back on).
              if (!reservable && !isAdmin) return;
              onRoomClick(floor, room.id);
            }}
          />
        );
      })}
    </div>
  );
}
