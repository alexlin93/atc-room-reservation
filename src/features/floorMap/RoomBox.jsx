import { percentStyle } from "../../utils/mapLayout";
import { computeRoomLabelStyle } from "../../utils/roomLabel";

// A single reservable room: colored box (green = free right now, red =
// occupied right now) with the room id as a label — vertically-rotated
// text for boxes whose height is meaningfully greater than their width,
// font-size tiered/shrunk to fit small boxes. Clicking (or Enter/Space)
// opens the room modal via onActivate.
export default function RoomBox({ room, data, occupied, isMine, onActivate }) {
  const labelStyle = computeRoomLabelStyle(room, data);
  const title =
    room.id + (occupied ? " — reserved now" : " — free now") + (isMine ? " — one of your reservations" : "");

  return (
    <div
      className={"room-box" + (occupied ? " occupied" : " free") + (isMine ? " room-box-mine" : "")}
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
