import { percentStyle } from "../../utils/mapLayout";
import { computeRoomLabelStyle } from "../../utils/roomLabel";

// A single reservable room: colored box (green = free right now, red =
// occupied right now) with the room id as a label — vertically-rotated
// text for boxes whose height is meaningfully greater than their width,
// font-size tiered/shrunk to fit small boxes. Clicking (or Enter/Space)
// opens the room modal via onActivate.
//
// isReservable (default true) — admin room-toggle feature (see
// hooks/useRoomOverrides.js): when false, shows greyed-out/disabled styling
// instead of the normal green/red coloring. Whether clicking still does
// anything in that state is decided by the caller's onActivate (FloorMap.jsx
// skips it for non-admins, still allows it for admins).
export default function RoomBox({ room, data, occupied, isMine, isReservable = true, onActivate }) {
  const labelStyle = computeRoomLabelStyle(room, data);
  const title =
    room.id +
    (isReservable ? (occupied ? " — reserved now" : " — free now") : " — currently unavailable") +
    (isMine ? " — one of your reservations" : "");

  return (
    <div
      className={
        "room-box" +
        (isReservable ? (occupied ? " occupied" : " free") : " room-box-disabled") +
        (isMine ? " room-box-mine" : "")
      }
      data-room-id={room.id}
      style={percentStyle(room, data)}
      title={title}
      tabIndex={0}
      role="button"
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <span
        className={"room-label" + (labelStyle.isVertical ? " room-label-vertical" : "")}
        style={{ fontSize: labelStyle.fontPx + "px" }}
      >
        {room.id}
      </span>
    </div>
  );
}
