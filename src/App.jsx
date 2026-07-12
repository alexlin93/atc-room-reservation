import { useEffect, useState } from "react";
import { useAuth } from "./features/auth/useAuth";
import AuthArea from "./features/auth/AuthArea";
import FloorTabs from "./features/floorMap/FloorTabs";
import Legend from "./features/floorMap/Legend";
import { useReservations } from "./hooks/useReservations";
import { useRoomOverrides } from "./hooks/useRoomOverrides";
import { useNow } from "./hooks/useNow";
import WelcomeScreen from "./pages/WelcomeScreen";
import MainAppPage from "./pages/MainAppPage";
import MyReservationsPage from "./pages/MyReservationsPage";

const REFRESH_INTERVAL_MS = 30000; // recompute "is it occupied right now" as time passes

// Root: owns the cross-cutting state shared across the sticky header, the
// main app page, and the My Reservations page (auth, the live reservations
// cache, "now", which floor is selected, and which modal/page is open),
// and renders the header directly (title + floor tabs + legend + auth
// area — kept together here, matching the original app's exact sticky
// header layout/CSS) alongside whichever page is currently showing.
export default function App() {
  const { user, isAdmin, signIn, signOut } = useAuth();
  const { reservations, loaded, refresh, insertReservation, updateReservationRow, deleteReservationRow } =
    useReservations();
  const { isRoomReservable, setRoomReservable, refresh: refreshRoomOverrides } = useRoomOverrides();
  const now = useNow(REFRESH_INTERVAL_MS);

  const [floor, setFloor] = useState(3);
  // { floor, roomId, editReservation } | null
  const [modalTarget, setModalTarget] = useState(null);
  const [myResOpen, setMyResOpen] = useState(false);

  function openModal(targetFloor, roomId, editReservation = null) {
    setModalTarget({ floor: targetFloor, roomId, editReservation });
  }
  function closeModal() {
    setModalTarget(null);
  }

  function openMyReservations() {
    if (!user) return;
    setMyResOpen(true);
  }
  function closeMyReservations() {
    setMyResOpen(false);
  }

  // My Reservations table's Edit button: same path the room modal's own
  // Edit button takes, just entered from a different starting point.
  function handleEditFromMyRes(r) {
    closeMyReservations();
    openModal(r.floor, r.roomId, r);
  }
  // My Reservations page's own floor-plan visual: clicking a room just
  // opens it normally (not in edit mode), same as the main map.
  function handleOpenRoomFromMyRes(f, roomId) {
    closeMyReservations();
    openModal(f, roomId);
  }

  // Nothing meaningful to show for a signed-out visitor, and the data was
  // scoped to whoever just signed out.
  const userEmail = user ? user.email : null;
  useEffect(() => {
    if (!userEmail) setMyResOpen(false);
  }, [userEmail]);

  // Escape closes whichever overlay is open, My Reservations taking
  // priority (matches the vanilla app's global keydown handler).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      if (myResOpen) {
        closeMyReservations();
      } else if (modalTarget) {
        closeModal();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [myResOpen, modalTarget]);

  const showAppChrome = !!user;

  return (
    <>
      <header className="app-header">
        <h1>ATC Room Reservations</h1>
        <FloorTabs
          floor={floor}
          onChange={setFloor}
          containerId="floorTabs"
          style={{ display: showAppChrome ? "flex" : "none" }}
        />
        <Legend style={{ display: showAppChrome ? "flex" : "none" }} />
        <AuthArea
          user={user}
          isAdmin={isAdmin}
          onSignIn={signIn}
          onSignOut={signOut}
          onOpenMyReservations={openMyReservations}
        />
      </header>

      <WelcomeScreen visible={!user} onSignIn={signIn} />

      <MainAppPage
        visible={showAppChrome}
        floor={floor}
        loaded={loaded}
        reservations={reservations}
        now={now}
        user={user}
        isAdmin={isAdmin}
        isRoomReservable={isRoomReservable}
        setRoomReservable={setRoomReservable}
        refreshRoomOverrides={refreshRoomOverrides}
        modalTarget={modalTarget}
        onOpenModal={openModal}
        onCloseModal={closeModal}
        insertReservation={insertReservation}
        updateReservationRow={updateReservationRow}
        deleteReservationRow={deleteReservationRow}
        refresh={refresh}
      />

      {myResOpen && (
        <MyReservationsPage
          user={user}
          isAdmin={isAdmin}
          reservations={reservations}
          now={now}
          currentFloor={floor}
          isRoomReservable={isRoomReservable}
          onClose={closeMyReservations}
          onEditReservation={handleEditFromMyRes}
          onOpenRoom={handleOpenRoomFromMyRes}
          deleteReservationRow={deleteReservationRow}
          refresh={refresh}
        />
      )}
    </>
  );
}
