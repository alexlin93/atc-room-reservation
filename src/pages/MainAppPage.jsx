import { FLOORS } from "../data/roomsData";
import FloorMap from "../features/floorMap/FloorMap";
import RoomModal from "../features/reservationModal/RoomModal";

// The main floor-plan view: the map for the selected floor, plus the room
// modal's open/close orchestration. (Floor tabs and the legend are shared
// features/floorMap components too, but render inside the sticky app
// header alongside the title/auth area — see App.jsx — since that's the
// original app's exact header layout/CSS; this page owns the map + modal
// that live in <main> below it.) Pure composition — all form/business
// logic lives inside RoomModal and its own subcomponents.
export default function MainAppPage({
  visible,
  floor,
  loaded,
  reservations,
  now,
  user,
  isAdmin,
  isRoomReservable,
  setRoomReservable,
  refreshRoomOverrides,
  modalTarget,
  onOpenModal,
  onCloseModal,
  insertReservation,
  updateReservationRow,
  deleteReservationRow,
  refresh,
}) {
  const floorData = FLOORS[floor];

  function handleModalOverlayClick(e) {
    if (e.target === e.currentTarget) onCloseModal();
  }

  return (
    <>
      <main id="mainApp" style={{ display: visible ? "block" : "none" }}>
        <div className="floor-title" id="floorTitle">
          {floorData.title}
          {loaded ? "" : " — loading reservations…"}
        </div>
        <div className="map-wrap">
          <FloorMap
            floor={floor}
            reservations={reservations}
            now={now}
            onRoomClick={onOpenModal}
            canvasId="mapCanvas"
            isRoomReservable={isRoomReservable}
            isAdmin={isAdmin}
          />
        </div>
      </main>

      <div
        className={"modal-overlay" + (modalTarget ? " open" : "")}
        id="modalOverlay"
        onClick={handleModalOverlayClick}
      >
        {modalTarget && (
          <RoomModal
            key={`${modalTarget.floor}-${modalTarget.roomId}-${
              modalTarget.editReservation ? modalTarget.editReservation.id : "new"
            }-${user ? user.email : "anon"}`}
            floor={modalTarget.floor}
            roomId={modalTarget.roomId}
            editReservation={modalTarget.editReservation}
            onClose={onCloseModal}
            reservations={reservations}
            loaded={loaded}
            now={now}
            user={user}
            isAdmin={isAdmin}
            isRoomReservable={isRoomReservable}
            setRoomReservable={setRoomReservable}
            refreshRoomOverrides={refreshRoomOverrides}
            insertReservation={insertReservation}
            updateReservationRow={updateReservationRow}
            deleteReservationRow={deleteReservationRow}
            refresh={refresh}
          />
        )}
      </div>
    </>
  );
}
