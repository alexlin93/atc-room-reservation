import { FLOORS } from "../../data/roomsData";
import FloorTabs from "../floorMap/FloorTabs";
import FloorMap from "../floorMap/FloorMap";

// The floor-plan visual half of the My Reservations page: the same shared
// FloorMap rendering as the main map, with a floor toggle, and the user's
// own reserved room(s) visually distinguished (highlightRoomIds -> the
// room-box-mine styling).
export default function MyReservationsMap({
  floor,
  onFloorChange,
  reservations,
  now,
  highlightRoomIds,
  onRoomClick,
  isRoomReservable,
  isAdmin,
}) {
  const data = FLOORS[floor];

  return (
    <div className="myres-maps">
      <FloorTabs floor={floor} onChange={onFloorChange} containerId="myResFloorTabs" containerClassName="myres-maps-tabs" />
      <div className="floor-title" id="myResFloorTitle">
        {data ? data.title : ""}
      </div>
      <div className="map-wrap">
        <FloorMap
          floor={floor}
          reservations={reservations}
          now={now}
          highlightRoomIds={highlightRoomIds}
          onRoomClick={onRoomClick}
          canvasId="myResMapCanvas"
          isRoomReservable={isRoomReservable}
          isAdmin={isAdmin}
        />
      </div>
      <div className="myres-map-legend">
        <span className="legend-item">
          <span className="swatch mine" /> Your reservation
        </span>
      </div>
    </div>
  );
}
