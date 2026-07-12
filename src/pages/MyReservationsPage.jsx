import { useMemo, useState } from "react";
import { isReservationUpcoming } from "../utils/time";
import MyReservationsTable from "../features/myReservations/MyReservationsTable";
import MyReservationsMap from "../features/myReservations/MyReservationsMap";

// My Reservations page: a table of the signed-in user's own upcoming
// reservations, plus the shared floor-plan visual below it with the user's
// own reserved room(s) highlighted. Mounted fresh each time it's opened
// (App only renders it while open), so `selectedFloor` initializes
// straight from props via useState's lazy initializer. Pure composition —
// table/map logic lives in the myReservations feature components.
export default function MyReservationsPage({
  user,
  isAdmin,
  reservations,
  now,
  currentFloor,
  isRoomReservable,
  onClose,
  onEditReservation,
  onOpenRoom,
  deleteReservationRow,
  refresh,
}) {
  const myUpcoming = useMemo(() => {
    if (!user) return [];
    return reservations
      .filter((r) => r.email === user.email && isReservationUpcoming(r))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.startHour - b.startHour;
      });
  }, [reservations, user]);

  const [selectedFloor, setSelectedFloor] = useState(() => {
    const floorsWithRes = myUpcoming.reduce((acc, r) => (acc.includes(r.floor) ? acc : [...acc, r.floor]), []);
    return floorsWithRes.length ? floorsWithRes[0] : currentFloor;
  });

  const highlightRoomIds = useMemo(
    () => myUpcoming.filter((r) => r.floor === selectedFloor).map((r) => r.roomId),
    [myUpcoming, selectedFloor]
  );

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay myres-overlay open" id="myReservationsOverlay" onClick={handleOverlayClick}>
      <div className="modal myres-modal" role="dialog" aria-modal="true" aria-labelledby="myResTitle">
        <button className="modal-close" id="myResClose" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <h2 id="myResTitle">My Reservations</h2>

        <div className="myres-body">
          <MyReservationsTable
            myUpcoming={myUpcoming}
            onEditReservation={onEditReservation}
            deleteReservationRow={deleteReservationRow}
            refresh={refresh}
          />
          <MyReservationsMap
            floor={selectedFloor}
            onFloorChange={setSelectedFloor}
            reservations={reservations}
            now={now}
            highlightRoomIds={highlightRoomIds}
            onRoomClick={onOpenRoom}
            isRoomReservable={isRoomReservable}
            isAdmin={isAdmin}
          />
        </div>

        <div className="myres-footer">
          <button type="button" className="btn-link" id="myResBackBtn" onClick={onClose}>
            ← Back to map
          </button>
        </div>
      </div>
    </div>
  );
}
