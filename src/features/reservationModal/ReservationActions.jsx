import { useState } from "react";

// Shared Edit/Cancel controls for a single reservation row — used by both
// the room modal's upcoming list (UpcomingList.jsx) and the My
// Reservations table (features/myReservations/MyReservationsTable.jsx), so
// both call paths share the exact same cancel logic (confirm -> delete ->
// shared refresh) rather than a parallel reimplementation. Only the
// reservation's own signed-in owner ever gets this rendered (callers check
// that before rendering it).
export default function ReservationActions({
  reservation,
  roomLabel,
  onEdit,
  deleteReservationRow,
  refresh,
  editingId,
  onExitEditIfMatches,
  actionsClassName,
}) {
  const [busy, setBusy] = useState(false);

  async function handleCancel() {
    if (!window.confirm(`Cancel this reservation for ${roomLabel} on ${reservation.date}?`)) return;
    setBusy(true);
    const result = await deleteReservationRow(reservation.id);
    if (result.error) {
      setBusy(false);
      window.alert("Could not cancel this reservation: " + result.error.message);
      return;
    }
    if (editingId === reservation.id && onExitEditIfMatches) onExitEditIfMatches();
    refresh();
  }

  return (
    <span className={actionsClassName}>
      <button type="button" className="btn-edit" onClick={onEdit}>
        Edit
      </button>
      <button type="button" className="btn-cancel" disabled={busy} onClick={handleCancel}>
        Cancel
      </button>
    </span>
  );
}
